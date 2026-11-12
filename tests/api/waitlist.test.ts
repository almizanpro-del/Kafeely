/**
 * Waitlist service tests (FR-01 … FR-03, FR-21, FR-24) plus the scheduled
 * purge, against real Postgres semantics via PGlite.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import {
  deleteWaitlistEntry,
  listWaitlist,
  logWaitlistExport,
  submitWaitlist,
  verifyWaitlist,
} from '../../api/_lib/services/waitlist';
import { purgeExpired } from '../../api/_lib/services/maintenance';
import { waitlistSubmissionSchema } from '../../api/_lib/validation';
import {
  FakeMailer,
  closeAllDbs,
  expectHttpError,
  makeDb,
  truncateAll,
  type TestDb,
} from './helpers';

let testDb: TestDb;
let mailer: FakeMailer;

const IP = '198.51.100.10';

function submission(overrides: Record<string, unknown> = {}) {
  return waitlistSubmissionSchema.parse({
    role: 'owner',
    subRole: 'Single-Unit Premium Owner',
    email: overrides.email ?? 'owner@example.com',
    contactConsent: true,
    marketingConsent: false,
    privacyConsentVersion: 'v1.1-UAE-PDPL',
    ...overrides,
  });
}

beforeEach(async () => {
  testDb = await makeDb();
  await truncateAll(testDb);
  mailer = new FakeMailer();
});

afterAll(closeAllDbs);

describe('submitWaitlist', () => {
  it('creates an unverified record with a hashed single-use token', async () => {
    await submitWaitlist(testDb.db, submission(), { ip: IP, mailer });

    const rows = await testDb.pgliteDb.select().from(schema.waitlistEntries);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('owner@example.com');
    expect(rows[0].verified).toBe(false);
    expect(rows[0].roleTags).toEqual(['owner']);
    expect(rows[0].verificationTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].verificationExpiresAt).toBeTruthy();

    // The email carries the raw token, but only its hash is stored.
    expect(mailer.sent).toHaveLength(1);
    const token = mailer.tokenFrom(0);
    expect(rows[0].verificationTokenHash).not.toBe(token);
    expect(mailer.sent[0].html).toContain('#verify-waitlist?token=');

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'CREATE')).toBe(true);
  });

  it('returns the same generic message for new and existing addresses', async () => {
    const first = await subscribe('owner@example.com');
    const second = await subscribe('owner@example.com');
    expect(second.message).toBe(first.message);
  });

  it('stages a duplicate submission instead of editing the live record (FR-03)', async () => {
    await subscribe('owner@example.com');
    await subscribe('owner@example.com', { role: 'tenant', subRole: 'Family Tenant', area: 'DIFC' });

    const rows = await testDb.pgliteDb.select().from(schema.waitlistEntries);
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe('owner');
    expect(rows[0].payload).not.toHaveProperty('area');

    const staged = rows[0].pendingUpdate as { data: { role: string; payload: { area?: string } } };
    expect(staged.data.role).toBe('tenant');
    expect(staged.data.payload.area).toBe('DIFC');

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'UPDATE_STAGED')).toBe(true);
  });

  async function subscribe(email: string, overrides: Record<string, unknown> = {}) {
    mailer = new FakeMailer();
    return submitWaitlist(testDb.db, submission({ email, ...overrides }), { ip: IP, mailer });
  }
});

describe('verifyWaitlist', () => {
  it('marks the record verified and consumes the token', async () => {
    await submitWaitlist(testDb.db, submission(), { ip: IP, mailer });
    const token = mailer.tokenFrom(0);

    await verifyWaitlist(testDb.db, token);

    const rows = await testDb.pgliteDb.select().from(schema.waitlistEntries);
    expect(rows[0].verified).toBe(true);
    expect(rows[0].verifiedAt).toBeTruthy();
    expect(rows[0].verificationTokenHash).toBeNull();

    // Replaying the same link is rejected.
    await expectHttpError(
      await verifyWaitlist(testDb.db, token).catch((e) => e),
      400,
      'invalid_token',
    );

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'DOUBLE_OPT_IN_VERIFY')).toBe(true);
  });

  it('applies the staged duplicate and merges role tags on confirmation (FR-02/FR-03)', async () => {
    await submitWaitlist(testDb.db, submission(), { ip: IP, mailer });
    mailer = new FakeMailer();
    await submitWaitlist(
      testDb.db,
      submission({ role: 'tenant', subRole: 'Family Tenant', area: 'DIFC' }),
      { ip: IP, mailer },
    );

    await verifyWaitlist(testDb.db, mailer.tokenFrom(0));

    const rows = await testDb.pgliteDb.select().from(schema.waitlistEntries);
    expect(rows[0].role).toBe('tenant');
    expect(rows[0].payload).toMatchObject({ area: 'DIFC' });
    expect(rows[0].roleTags).toEqual(expect.arrayContaining(['owner', 'tenant']));
    expect(rows[0].pendingUpdate).toBeNull();

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'UPDATE_APPLIED')).toBe(true);
  });

  it('rejects unknown and expired tokens with the same generic failure', async () => {
    await expectHttpError(
      await verifyWaitlist(testDb.db, 'not-a-real-token-value').catch((e) => e),
      400,
      'invalid_token',
    );

    await submitWaitlist(testDb.db, submission(), { ip: IP, mailer });
    await testDb.pgliteDb
      .update(schema.waitlistEntries)
      .set({ verificationExpiresAt: new Date(Date.now() - 1000) });

    await expectHttpError(
      await verifyWaitlist(testDb.db, mailer.tokenFrom(0)).catch((e) => e),
      400,
      'invalid_token',
    );
  });
});

describe('erasure & export logging', () => {
  it('hard-deletes the record and logs it without personal data (FR-24)', async () => {
    await submitWaitlist(testDb.db, submission({ email: 'sensitive@example.com' }), { ip: IP, mailer });
    const [row] = await testDb.pgliteDb.select().from(schema.waitlistEntries);

    await deleteWaitlistEntry(testDb.db, row.id, 'admin@kafeely.test');

    expect(await testDb.pgliteDb.select().from(schema.waitlistEntries)).toHaveLength(0);

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    const erase = audits.find((a) => a.action === 'DELETE_REQUESTED');
    expect(erase).toBeDefined();
    const serialized = JSON.stringify(erase);
    expect(serialized).not.toContain('sensitive@example.com');
    expect(serialized).not.toContain(row.id);
    expect(erase?.targetEmail).toBeNull();
    expect(erase?.targetId).toBeNull();
  });

  it('rejects unknown ids and bad id formats', async () => {
    await expectHttpError(
      await deleteWaitlistEntry(testDb.db, 'not-an-id', 'admin@kafeely.test').catch((e) => e),
      422,
    );
    await expectHttpError(
      await deleteWaitlistEntry(
        testDb.db,
        '00000000-0000-4000-8000-000000000000',
        'admin@kafeely.test',
      ).catch((e) => e),
      404,
      'record_not_found',
    );
  });

  it('records CSV exports without personal data (FR-21)', async () => {
    await logWaitlistExport(testDb.db, 'admin@kafeely.test', 12);
    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    const exportLog = audits.find((a) => a.action === 'EXPORT_CSV');
    expect(exportLog?.details).toContain('12');
    expect(exportLog?.targetEmail).toBeNull();
  });

  it('lists only non-deleted records, newest first', async () => {
    await submitWaitlist(testDb.db, submission({ email: 'a@example.com' }), { ip: IP, mailer });
    await submitWaitlist(testDb.db, submission({ email: 'b@example.com' }), { ip: IP, mailer });
    await testDb.pgliteDb
      .update(schema.waitlistEntries)
      .set({ deletedAt: new Date() })
      .where(eq(schema.waitlistEntries.email, 'a@example.com'));

    const list = await listWaitlist(testDb.db);
    expect(list.map((e) => e.email)).toEqual(['b@example.com']);
  });
});

describe('purgeExpired', () => {
  it('prunes expired sessions/tokens/windows and honours the 30-day erasure window', async () => {
    const [active] = await testDb.pgliteDb
      .insert(schema.users)
      .values({
        email: 'active@kafeely.test',
        name: 'Active',
        passwordHash: 'x',
        status: 'active',
      })
      .returning();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // One live and one expired session.
    await testDb.pgliteDb.insert(schema.sessions).values([
      { userId: active.id, tokenHash: 'live-session', expiresAt: new Date(Date.now() + 60_000) },
      { userId: active.id, tokenHash: 'stale-session', expiresAt: daysAgo(1) },
    ]);

    // One used token and one live token.
    await testDb.pgliteDb.insert(schema.emailTokens).values([
      {
        userId: active.id,
        purpose: 'reset_password',
        tokenHash: 'used-token',
        expiresAt: new Date(Date.now() + 600_000),
        usedAt: daysAgo(1),
      },
      {
        userId: active.id,
        purpose: 'verify_email',
        tokenHash: 'live-token',
        expiresAt: new Date(Date.now() + 600_000),
      },
    ]);

    // Rate-limit windows: stale vs fresh.
    await testDb.pgliteDb.insert(schema.rateLimitHits).values([
      { key: 'stale', windowStart: daysAgo(2), count: 3 },
      { key: 'fresh', windowStart: new Date(), count: 1 },
    ]);

    // A user soft-deleted 31 days ago and one deleted yesterday.
    const [oldUser] = await testDb.pgliteDb
      .insert(schema.users)
      .values({
        email: 'old@kafeely.test',
        name: 'Old',
        passwordHash: 'x',
        status: 'deleted',
        deletedAt: daysAgo(31),
      })
      .returning();
    await testDb.pgliteDb.insert(schema.users).values({
      email: 'recent@kafeely.test',
      name: 'Recent',
      passwordHash: 'x',
      status: 'deleted',
      deletedAt: daysAgo(1),
    });

    // Waitlist rows: one old soft-delete and one row with an expired token.
    await testDb.pgliteDb.insert(schema.waitlistEntries).values([
      {
        email: 'gone@example.com',
        role: 'owner',
        subRole: 'Owner',
        privacyConsentVersion: 'v1',
        deletedAt: daysAgo(31),
      },
      {
        email: 'pending@example.com',
        role: 'tenant',
        subRole: 'Tenant',
        privacyConsentVersion: 'v1',
        verificationTokenHash: 'a'.repeat(64),
        verificationExpiresAt: daysAgo(1),
      },
    ]);

    const result = await purgeExpired(testDb.db);

    expect(result.sessions).toBe(1);
    expect(result.emailTokens).toBe(1);
    expect(result.rateLimitWindows).toBe(1);
    expect(result.erasedUsers).toBe(1);
    expect(result.erasedWaitlist).toBe(1);
    expect(result.clearedWaitlistTokens).toBe(1);

    const users = await testDb.pgliteDb.select().from(schema.users);
    expect(users.map((u) => u.email).sort()).toEqual(['active@kafeely.test', 'recent@kafeely.test']);
    expect(users.some((u) => u.id === oldUser.id)).toBe(false);

    const waitlist = await testDb.pgliteDb.select().from(schema.waitlistEntries);
    expect(waitlist).toHaveLength(1);
    expect(waitlist[0].email).toBe('pending@example.com');
    expect(waitlist[0].verificationTokenHash).toBeNull();
    expect(waitlist[0].verificationExpiresAt).toBeNull();

    const sessions = await testDb.pgliteDb.select().from(schema.sessions);
    expect(sessions.map((s) => s.tokenHash)).toEqual(['live-session']);
  });
});

/**
 * Registration + validation tests (docs/backend-migration.md §6 "register").
 */

import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { register } from '../../api/_lib/services/auth';
import { registerSchema } from '../../api/_lib/validation';
import {
  closeAllDbs,
  expectHttpError,
  FakeMailer,
  makeDb,
  seedUser,
  uniqueEmail,
  type TestDb,
} from './helpers';

afterAll(closeAllDbs);

const GOOD_PASSWORD = 'correct horse battery 9';

function parseRegister(input: unknown) {
  return registerSchema.parse(input);
}

describe('registration schema (zod + shared validator)', () => {
  it('accepts a valid email and normalizes it to lowercase', () => {
    const parsed = parseRegister({ email: '  Owner.Tag@EXAMPLE.COM ', name: 'A', password: GOOD_PASSWORD });
    expect(parsed.email).toBe('owner.tag@example.com');
  });

  it('rejects malformed emails using the shared validator', () => {
    for (const bad of ['a..b@example.com', 'nope', 'missing@tld', 'spaces in@x.com', 'a@b.c.']) {
      const result = registerSchema.safeParse({ email: bad, name: 'A', password: GOOD_PASSWORD });
      expect(result.success, bad).toBe(false);
    }
  });

  it('rejects short, oversized and common passwords', () => {
    for (const bad of ['short', 'a'.repeat(129), 'Password123!', 'p@ssw0rd', '123456']) {
      const result = registerSchema.safeParse({
        email: 'x@example.com',
        name: 'A',
        password: bad,
      });
      expect(result.success, bad.slice(0, 12)).toBe(false);
    }
  });

  it('requires a non-empty name (max 80 chars)', () => {
    expect(registerSchema.safeParse({ email: 'x@example.com', name: '', password: GOOD_PASSWORD }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'x@example.com', name: 'x'.repeat(81), password: GOOD_PASSWORD }).success).toBe(false);
  });
});

describe('register() service', () => {
  let testDb: TestDb;
  const mailer = new FakeMailer();

  async function call(email: string, extra: Record<string, unknown> = {}, ip: string | null = null) {
    const input = await parseRegister({ email, name: 'New Member', password: GOOD_PASSWORD, ...extra });
    return register(testDb.db, input, { ip, userAgent: 'vitest', mailer });
  }

  it('bootstraps the Super-Admin with the one-time ADMIN_BOOTSTRAP_TOKEN', async () => {
    testDb = await makeDb();
    process.env.ADMIN_BOOTSTRAP_TOKEN = 'boot-token-test-123';
    try {
      const result = await call('owner@kafeely.test', { bootstrapToken: 'boot-token-test-123' });
      expect(result.bootstrap).toBe(true);
      expect(result.user.role).toBe('super_admin');
      expect(result.user.status).toBe('active');
      expect(result.user.emailVerifiedAt).toBeTruthy();
      expect(result.verifyEmailSent).toBe(false);

      const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
      expect(audits.some((a) => a.action === 'ADMIN_REGISTER')).toBe(true);
    } finally {
      delete process.env.ADMIN_BOOTSTRAP_TOKEN;
    }
  });

  it('creates a pending, unverified staff account and emails a verification token', async () => {
    testDb = await makeDb();
    const email = uniqueEmail('pending');
    const result = await call(email);

    expect(result.bootstrap).toBe(false);
    expect(result.user.status).toBe('pending');
    expect(result.user.role).toBe('staff');
    expect(result.user.emailVerifiedAt).toBeNull();
    expect(result.verifyEmailSent).toBe(true);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe(email);
    expect(mailer.sent[0].subject).toContain('Verify');

    const tokens = await testDb.pgliteDb.select().from(schema.emailTokens);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].purpose).toBe('verify_email');
    expect(tokens[0].usedAt).toBeNull();
  });

  it('stores emails normalized-lowercase (case-insensitive uniqueness)', async () => {
    testDb = await makeDb();
    const raw = `MiXeD.Case@ExAmPlE.CoM`;
    await call(raw);
    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.email, 'mixed.case@example.com'));
    expect(rows).toHaveLength(1);
  });

  it('rejects duplicate emails with 409', async () => {
    testDb = await makeDb();
    const email = uniqueEmail('dup');
    await seedUser(testDb, { email });
    await expectHttpError(
      await call(email).catch((e) => e),
      409,
      'email_taken',
    );
  });

  it('enforces the 30-second per-email registration cooldown', async () => {
    testDb = await makeDb();
    const email = uniqueEmail('cooldown');
    await call(email);
    // Same normalized email again inside the window → 429 (anti-spam parity).
    await expectHttpError(await call(email).catch((e) => e), 429, 'rate_limited');
  });

  it('rate limits registrations per IP (10/hour)', async () => {
    testDb = await makeDb();
    const ip = '203.0.113.9';
    for (let i = 0; i < 10; i++) {
      await call(uniqueEmail(`ip${i}`), {}, ip);
    }
    await expectHttpError(await call(uniqueEmail('ip11'), {}, ip).catch((e) => e), 429, 'rate_limited');
    // A different IP is unaffected.
    await call(uniqueEmail('otherip'), {}, '198.51.100.7');
  });

  it('writes an audit entry for pending registrations', async () => {
    testDb = await makeDb();
    await call(uniqueEmail('audit'));
    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_REGISTER' && a.performedBy !== 'bootstrap-token')).toBe(true);
  });
});

describe('bootstrap token handling', () => {
  it('rejects a wrong bootstrap token as a normal pending registration', async () => {
    const testDb = await makeDb();
    process.env.ADMIN_BOOTSTRAP_TOKEN = 'boot-token-real';
    try {
      const input = await parseRegister({
        email: uniqueEmail('wrongboot'),
        name: 'Impostor',
        password: GOOD_PASSWORD,
        bootstrapToken: 'boot-token-wrong',
      });
      const result = await register(testDb.db, input, { mailer: new FakeMailer() });
      expect(result.bootstrap).toBe(false);
      expect(result.user.role).toBe('staff');
    } finally {
      delete process.env.ADMIN_BOOTSTRAP_TOKEN;
    }
  });

  it('treats registration as pending when no bootstrap token is configured', async () => {
    const testDb = await makeDb();
    const input = await parseRegister({
      email: uniqueEmail('noboot'),
      name: 'Someone',
      password: GOOD_PASSWORD,
      bootstrapToken: 'anything',
    });
    const result = await register(testDb.db, input, { mailer: new FakeMailer() });
    expect(result.bootstrap).toBe(false);
    expect(result.user.status).toBe('pending');
  });
});

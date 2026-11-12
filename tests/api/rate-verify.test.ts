/**
 * Rate limiter + email-verification token tests. The limiter runs against
 * real Postgres upserts (PGlite); tokens prove single-use + expiry + purpose
 * isolation under genuine DB semantics.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { rateLimit } from '../../api/_lib/ratelimit';
import { createEmailToken, RESET_TOKEN_TTL_MS, VERIFY_TOKEN_TTL_MS } from '../../api/_lib/tokens';
import { register, verifyEmail } from '../../api/_lib/services/auth';
import { registerSchema } from '../../api/_lib/validation';
import {
  closeAllDbs,
  expectHttpError,
  FakeMailer,
  makeDb,
  seedUser,
  truncateAll,
  type TestDb,
} from './helpers';

afterAll(closeAllDbs);

let testDb: TestDb;

beforeEach(async () => {
  testDb = await makeDb();
  await truncateAll(testDb);
});

describe('fixed-window rate limiter (Postgres upsert)', () => {
  it('counts up to the limit, then 429s', async () => {
    await rateLimit(testDb.db, 'key-a', 3, 60);
    await rateLimit(testDb.db, 'key-a', 3, 60);
    await rateLimit(testDb.db, 'key-a', 3, 60);
    await expectHttpError(await rateLimit(testDb.db, 'key-a', 3, 60).catch((e) => e), 429, 'rate_limited');
    // Independent keys are unaffected.
    await rateLimit(testDb.db, 'key-b', 3, 60);
  });

  it('resets when the window rolls over', async () => {
    await rateLimit(testDb.db, 'roll', 1, 1); // 1-second window
    await expectHttpError(await rateLimit(testDb.db, 'roll', 1, 1).catch((e) => e), 429);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const result = await rateLimit(testDb.db, 'roll', 1, 1);
    expect(result.count).toBe(1);
  });

  it('persists counters in the rate_limit_hits table', async () => {
    await rateLimit(testDb.db, 'persist', 5, 60);
    const rows = await testDb.pgliteDb.select().from(schema.rateLimitHits);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(1);
    await rateLimit(testDb.db, 'persist', 5, 60);
    const after = await testDb.pgliteDb.select().from(schema.rateLimitHits);
    expect(after[0].count).toBe(2);
  });
});

describe('email verification tokens', () => {
  it('has the documented TTLs (verify 24h, reset 15min)', () => {
    expect(VERIFY_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(RESET_TOKEN_TTL_MS).toBe(15 * 60 * 1000);
  });

  it('verifies a pending account via the emailed token', async () => {
    const mailer = new FakeMailer();
    const input = registerSchema.parse({
      email: 'verify-me@kafeely.test',
      name: 'Verifier',
      password: 'correct horse battery 9',
    });
    await register(testDb.db, input, { mailer, userAgent: 'vitest' });
    const token = mailer.tokenFrom(0);

    const result = await verifyEmail(testDb.db, token);
    expect(result.message).toContain('verified');

    const users = await testDb.pgliteDb.select().from(schema.users);
    expect(users[0].emailVerifiedAt).toBeTruthy();
    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_EMAIL_VERIFIED')).toBe(true);
  });

  it('rejects token reuse (single-use)', async () => {
    const user = await seedUser(testDb, { status: 'pending', verified: false });
    const issued = await createEmailToken(testDb.db, user.id, 'verify_email', VERIFY_TOKEN_TTL_MS);

    await verifyEmail(testDb.db, issued.token);
    await expectHttpError(
      await verifyEmail(testDb.db, issued.token).catch((e) => e),
      400,
      'invalid_token',
    );
  });

  it('rejects expired tokens (24-hour validity)', async () => {
    const user = await seedUser(testDb, { status: 'pending', verified: false });
    const issued = await createEmailToken(testDb.db, user.id, 'verify_email', VERIFY_TOKEN_TTL_MS);
    await testDb.pgliteDb
      .update(schema.emailTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(sql`1 = 1`);
    await expectHttpError(
      await verifyEmail(testDb.db, issued.token).catch((e) => e),
      400,
      'invalid_token',
    );
  });

  it('isolates purposes: a reset token can never verify an email', async () => {
    const user = await seedUser(testDb);
    const issued = await createEmailToken(testDb.db, user.id, 'reset_password', RESET_TOKEN_TTL_MS);
    await expectHttpError(
      await verifyEmail(testDb.db, issued.token).catch((e) => e),
      400,
      'invalid_token',
    );
  });

  it('gives the same generic error for unknown tokens', async () => {
    await expectHttpError(
      await verifyEmail(testDb.db, 'totally-unknown-token-value').catch((e) => e),
      400,
      'invalid_token',
    );
  });
});

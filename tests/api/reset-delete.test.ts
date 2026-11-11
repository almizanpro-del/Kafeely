/**
 * Forgot-password / reset / change-password / delete-account tests
 * (docs/backend-migration.md §6). Covers the plan's security invariants:
 * generic responses, single-use expiring tokens, session revocation,
 * soft-delete with PII-free audit.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import {
  changePassword,
  deleteAccount,
  forgotPassword,
  login,
  me,
  resetPassword,
} from '../../api/_lib/services/auth';
import { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, loginSchema } from '../../api/_lib/validation';
import {
  closeAllDbs,
  expectHttpError,
  FakeMailer,
  makeDb,
  seedUser,
  truncateAll,
  type SeedUser,
  type TestDb,
} from './helpers';

afterAll(closeAllDbs);

const PASSWORD = 'correct horse battery 9';
const NEW_PASSWORD = 'brand-new-password-77';

let testDb: TestDb;
let user: SeedUser;
const mailer = new FakeMailer();

async function attemptLogin(email: string, password: string) {
  const input = { email, password };
  return login(testDb.db, loginSchema.parse(input), { ip: null, userAgent: 'vitest' });
}

async function requestReset(email: string): Promise<string> {
  const input = forgotPasswordSchema.parse({ email });
  await forgotPassword(testDb.db, input, { mailer, linkBase: 'https://kafeely.com' });
  return mailer.tokenFrom(mailer.sent.length - 1);
}

beforeEach(async () => {
  testDb = await makeDb();
  await truncateAll(testDb);
  user = await seedUser(testDb, { email: 'resettable@kafeely.test', password: PASSWORD });
  mailer.sent.length = 0;
});

describe('forgot password', () => {
  it('answers identically for unknown emails and sends nothing', async () => {
    const input = forgotPasswordSchema.parse({ email: 'ghost@kafeely.test' });
    const result = await forgotPassword(testDb.db, input, { mailer, linkBase: 'https://kafeely.com' });
    expect(result.message).toBe('If that address is registered, a reset link has been sent.');
    expect(mailer.sent).toHaveLength(0);
  });

  it('sends a single-use reset token for an existing account', async () => {
    const token = await requestReset(user.email);
    expect(token.length).toBeGreaterThan(20);
    expect(mailer.sent[0].to).toBe(user.email);
    expect(mailer.sent[0].html).toContain('https://kafeely.com/#reset-password');

    const rows = await testDb.pgliteDb.select().from(schema.emailTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0].purpose).toBe('reset_password');
    expect(rows[0].usedAt).toBeNull();
  });

  it('rate limits reset requests (3/hour per email)', async () => {
    for (let i = 0; i < 3; i++) await requestReset(user.email);
    await expectHttpError(
      await requestReset(user.email).catch((e) => e),
      429,
      'rate_limited',
    );
    expect(mailer.sent).toHaveLength(3);
  });
});

describe('reset password', () => {
  it('changes the password, revokes all sessions, and lets the new password in', async () => {
    const sessionA = (await attemptLogin(user.email, PASSWORD)).sessionToken;
    const token = await requestReset(user.email);

    const result = await resetPassword(testDb.db, resetPasswordSchema.parse({ token, password: NEW_PASSWORD }));
    expect(result.message).toContain('signed out');

    await expectHttpError(await me(testDb.db, sessionA).catch((e) => e), 401);
    await expectHttpError(await attemptLogin(user.email, PASSWORD).catch((e) => e), 401);
    const fresh = await attemptLogin(user.email, NEW_PASSWORD);
    expect(fresh.user.email).toBe(user.email);
  });

  it('is single-use (second consumption fails with a generic error)', async () => {
    const token = await requestReset(user.email);
    await resetPassword(testDb.db, resetPasswordSchema.parse({ token, password: NEW_PASSWORD }));
    await expectHttpError(
      await resetPassword(testDb.db, resetPasswordSchema.parse({ token, password: 'yet-another-pass-99' })).catch((e) => e),
      400,
      'invalid_token',
    );
  });

  it('rejects expired tokens (15-minute validity)', async () => {
    const token = await requestReset(user.email);
    await testDb.pgliteDb
      .update(schema.emailTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(sql`1 = 1`);
    await expectHttpError(
      await resetPassword(testDb.db, resetPasswordSchema.parse({ token, password: NEW_PASSWORD })).catch((e) => e),
      400,
      'invalid_token',
    );
  });

  it('verifies an unverified account (mailbox ownership proven)', async () => {
    const pending = await seedUser(testDb, { status: 'pending', verified: false });
    const token = await requestReset(pending.email);
    await resetPassword(testDb.db, resetPasswordSchema.parse({ token, password: NEW_PASSWORD }));
    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, pending.id));
    expect(rows[0].emailVerifiedAt).toBeTruthy();
  });

  it('clears lockouts on reset', async () => {
    await testDb.pgliteDb
      .update(schema.users)
      .set({ lockedUntil: new Date(Date.now() + 10 * 60 * 1000), failedAttempts: 5 })
      .where(eq(schema.users.id, user.id));
    const token = await requestReset(user.email);
    await resetPassword(testDb.db, resetPasswordSchema.parse({ token, password: NEW_PASSWORD }));
    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(rows[0].lockedUntil).toBeNull();
    expect(rows[0].failedAttempts).toBe(0);
    const fresh = await attemptLogin(user.email, NEW_PASSWORD);
    expect(fresh.user.email).toBe(user.email);
  });
});

describe('change password (authenticated)', () => {
  it('requires the correct current password', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);
    const input = changePasswordSchema.parse({ currentPassword: 'not-my-password', newPassword: NEW_PASSWORD });
    await expectHttpError(
      await changePassword(testDb.db, sessionToken, input).catch((e) => e),
      401,
      'wrong_current_password',
    );
  });

  it('keeps the current session and signs out all other devices', async () => {
    const sessionA = (await attemptLogin(user.email, PASSWORD)).sessionToken;
    const sessionB = (await attemptLogin(user.email, PASSWORD)).sessionToken;

    const input = changePasswordSchema.parse({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    const result = await changePassword(testDb.db, sessionA, input);
    expect(result.message).toContain('Other devices were signed out');

    await me(testDb.db, sessionA); // current device still signed in
    await expectHttpError(await me(testDb.db, sessionB).catch((e) => e), 401);

    await expectHttpError(await attemptLogin(user.email, PASSWORD).catch((e) => e), 401);
    await attemptLogin(user.email, NEW_PASSWORD);

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_PASSWORD_CHANGED')).toBe(true);
  });

  it('401s without a valid session', async () => {
    const input = changePasswordSchema.parse({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    await expectHttpError(await changePassword(testDb.db, null, input).catch((e) => e), 401);
  });
});

describe('delete my account (authenticated)', () => {
  it('requires the password, soft-deletes, revokes sessions, and audits PII-free', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);

    await expectHttpError(
      await deleteAccount(testDb.db, sessionToken, { password: 'nope' }).catch((e) => e),
      401,
      'wrong_current_password',
    );

    const result = await deleteAccount(testDb.db, sessionToken, { password: PASSWORD });
    expect(result.message).toContain('30 days');

    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(rows[0].status).toBe('deleted');
    expect(rows[0].deletedAt).toBeTruthy();

    await expectHttpError(await me(testDb.db, sessionToken).catch((e) => e), 401);
    const sessions = await testDb.pgliteDb.select().from(schema.sessions);
    expect(sessions).toHaveLength(0);

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    const deletion = audits.find((a) => a.action === 'ADMIN_ACCOUNT_DELETED');
    expect(deletion).toBeTruthy();
    expect(deletion?.targetEmail).toBeNull(); // FR-24: PII-free erasure entry

    // Post-deletion login is a generic 401 (no enumeration).
    await expectHttpError(
      await attemptLogin(user.email, PASSWORD).catch((e) => e),
      401,
      'invalid_credentials',
      'Incorrect email or password.',
    );
  });

  it('401s without a valid session', async () => {
    await expectHttpError(
      await deleteAccount(testDb.db, null, { password: PASSWORD }).catch((e) => e),
      401,
    );
  });
});

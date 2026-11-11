/**
 * Login, lockout and session lifecycle tests (docs/backend-migration.md §6
 * "login" / "sessions"). Exercises real Postgres rows via PGlite.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { login, logout, me } from '../../api/_lib/services/auth';
import { buildClearedSessionCookie, buildSessionCookie, readSessionCookie } from '../../api/_lib/cookies';
import { loginSchema } from '../../api/_lib/validation';
import {
  closeAllDbs,
  expectHttpError,
  makeDb,
  seedUser,
  truncateAll,
  type SeedUser,
  type TestDb,
} from './helpers';

const PASSWORD = 'correct horse battery 9';

let testDb: TestDb;
let user: SeedUser;
let stale: SeedUser; // second user for cross-account assertions

async function attemptLogin(email: string, password: string) {
  const input = loginSchema.parse({ email, password });
  return login(testDb.db, input, { ip: '192.0.2.1', userAgent: 'vitest' });
}

beforeEach(async () => {
  testDb = await makeDb();
  await truncateAll(testDb);
  user = await seedUser(testDb, { email: 'staff@kafeely.test', password: PASSWORD });
  stale = await seedUser(testDb, { email: 'other@kafeely.test' });
});

afterAll(closeAllDbs);

describe('login', () => {
  it('signs in with correct credentials and creates a server session', async () => {
    const result = await attemptLogin(user.email, PASSWORD);
    expect(result.user.email).toBe(user.email);
    expect(result.user.role).toBe('staff');
    expect(result.sessionToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);

    const sessions = await testDb.pgliteDb.select().from(schema.sessions);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toBe(user.id);
    expect(sessions[0].ip).toBe('192.0.2.1');
    expect(sessions[0].userAgent).toBe('vitest');

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_LOGIN_SUCCESS')).toBe(true);
  });

  it('gives a generic answer for unknown emails (no account enumeration)', async () => {
    await expectHttpError(
      await attemptLogin('nobody@kafeely.test', PASSWORD).catch((e) => e),
      401,
      'invalid_credentials',
      'Incorrect email or password.',
    );
  });

  it('gives a generic answer for deleted accounts', async () => {
    const deleted = await seedUser(testDb, { status: 'deleted' });
    await expectHttpError(
      await attemptLogin(deleted.email, PASSWORD).catch((e) => e),
      401,
      'invalid_credentials',
      'Incorrect email or password.',
    );
  });

  it('locks after five wrong passwords without revealing attempt counts', async () => {
    // Every failure — including the fifth — gets the identical generic answer.
    await expectHttpError(
      await attemptLogin(user.email, 'wrong-1').catch((e) => e),
      401,
      'invalid_credentials',
      'Incorrect email or password.',
    );
    await attemptLogin(user.email, 'wrong-2').catch(() => {});
    await attemptLogin(user.email, 'wrong-3').catch(() => {});
    await attemptLogin(user.email, 'wrong-4').catch(() => {});
    await expectHttpError(
      await attemptLogin(user.email, 'wrong-5').catch((e) => e),
      401,
      'invalid_credentials',
      'Incorrect email or password.',
    );

    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(rows[0].lockedUntil).toBeTruthy();

    // Even the correct password is now rejected while locked — with the same
    // generic response, so a lockout cannot confirm that the email exists.
    await expectHttpError(
      await attemptLogin(user.email, PASSWORD).catch((e) => e),
      401,
      'invalid_credentials',
    );

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_LOCKOUT')).toBe(true);
  });

  it('counts concurrent failures atomically (cannot be bypassed in parallel)', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => attemptLogin(user.email, 'parallel-wrong')),
    );
    expect(results.every((r) => r.status === 'rejected')).toBe(true);

    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(rows[0].lockedUntil).toBeTruthy();
  });

  it('clears the lockout after the window passes', async () => {
    await testDb.pgliteDb
      .update(schema.users)
      .set({ lockedUntil: new Date(Date.now() - 1000), failedAttempts: 5 })
      .where(eq(schema.users.id, user.id));
    const result = await attemptLogin(user.email, PASSWORD);
    expect(result.user.email).toBe(user.email);
    expect(result.user.lastLoginAt).toBeTruthy();
  });

  it('rejects suspended accounts and resets the failure counter on success', async () => {
    await attemptLogin(user.email, 'wrong-1').catch(() => {});
    const ok = await attemptLogin(user.email, PASSWORD);
    expect(ok.user.email).toBe(user.email);
    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(rows[0].failedAttempts).toBe(0);
    expect(rows[0].lockedUntil).toBeNull();

    await testDb.pgliteDb.update(schema.users).set({ status: 'suspended' }).where(eq(schema.users.id, user.id));
    await expectHttpError(
      await attemptLogin(user.email, PASSWORD).catch((e) => e),
      403,
      'account_suspended',
    );
  });

  it('distinguishes unverified vs pending-approval for correct passwords', async () => {
    const unverified = await seedUser(testDb, { status: 'pending', verified: false });
    await expectHttpError(
      await attemptLogin(unverified.email, PASSWORD).catch((e) => e),
      403,
      'email_unverified',
    );

    const pendingVerified = await seedUser(testDb, { status: 'pending', verified: true });
    await expectHttpError(
      await attemptLogin(pendingVerified.email, PASSWORD).catch((e) => e),
      403,
      'pending_approval',
    );
  });

  it('creates independent sessions per login (multi-device)', async () => {
    const first = await attemptLogin(user.email, PASSWORD);
    const second = await attemptLogin(user.email, PASSWORD);
    expect(first.sessionToken).not.toBe(second.sessionToken);

    const a = await me(testDb.db, first.sessionToken);
    const b = await me(testDb.db, second.sessionToken);
    expect(a.user.id).toBe(user.id);
    expect(b.user.id).toBe(user.id);
  });

  it('rate limits login attempts per IP (30 / 15 minutes)', async () => {
    // 30 unknown-email attempts are cheap and generic; #31 must be 429.
    for (let i = 0; i < 30; i++) {
      await attemptLogin(`unknown-${i}@kafeely.test`, PASSWORD).catch(() => {});
    }
    await expectHttpError(
      await attemptLogin('unknown-final@kafeely.test', PASSWORD).catch((e) => e),
      429,
      'rate_limited',
    );
  });
});

describe('sessions: me / logout / expiry / sliding renewal', () => {
  it('resolves the cookie token to the signed-in user', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);
    const result = await me(testDb.db, sessionToken);
    expect(result.user.id).toBe(user.id);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a missing or unknown session cookie', async () => {
    await expectHttpError(await me(testDb.db, null).catch((e) => e), 401);
    await expectHttpError(await me(testDb.db, 'garbage-token').catch((e) => e), 401);
  });

  it('revokes the session on logout', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);
    await logout(testDb.db, sessionToken);
    await expectHttpError(await me(testDb.db, sessionToken).catch((e) => e), 401);

    const sessions = await testDb.pgliteDb.select().from(schema.sessions);
    expect(sessions).toHaveLength(0);
    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_LOGOUT')).toBe(true);
  });

  it('rejects and cleans up expired sessions', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);
    await testDb.pgliteDb
      .update(schema.sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(sql`1 = 1`);
    await expectHttpError(await me(testDb.db, sessionToken).catch((e) => e), 401);
    const sessions = await testDb.pgliteDb.select().from(schema.sessions);
    expect(sessions).toHaveLength(0);
  });

  it('slides the 14-day expiry forward after inactivity', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    await testDb.pgliteDb
      .update(schema.sessions)
      .set({ lastSeenAt: twoHoursAgo, expiresAt: soon })
      .where(sql`1 = 1`);

    const result = await me(testDb.db, sessionToken);
    expect(result.expiresAt.getTime()).toBeGreaterThan(soon.getTime() + 12 * 24 * 60 * 60 * 1000 - 60000);

    // Immediate second call must NOT write again (touch throttling).
    const after = await me(testDb.db, sessionToken);
    expect(after.expiresAt.getTime()).toBe(result.expiresAt.getTime());
  });

  it('revokes sessions when the account becomes suspended', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);
    await testDb.pgliteDb.update(schema.users).set({ status: 'suspended' }).where(eq(schema.users.id, user.id));
    await expectHttpError(await me(testDb.db, sessionToken).catch((e) => e), 403, 'account_suspended');
    const sessions = await testDb.pgliteDb.select().from(schema.sessions);
    expect(sessions).toHaveLength(0);
  });

  it('does not leak the other test user in any session', async () => {
    const { sessionToken } = await attemptLogin(user.email, PASSWORD);
    const result = await me(testDb.db, sessionToken);
    expect(result.user.email).toBe(user.email);
    expect(result.user.email).not.toBe(stale.email);
  });
});

describe('session cookie format', () => {
  it('uses a __Host- prefixed, Secure, HttpOnly, SameSite=Lax cookie (14 days)', () => {
    const cookie = buildSessionCookie('token-value');
    expect(cookie.startsWith('__Host-session=token-value;')).toBe(true);
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=1209600');
  });

  it('falls back to a plain cookie name without Secure under COOKIE_INSECURE=1 (local http)', () => {
    process.env.COOKIE_INSECURE = '1';
    try {
      const cookie = buildSessionCookie('t');
      expect(cookie.startsWith('kafeely-session=t;')).toBe(true);
      expect(cookie).not.toContain('Secure');
    } finally {
      delete process.env.COOKIE_INSECURE;
    }
  });

  it('clears the cookie with Max-Age=0 and parses cookies back', () => {
    expect(buildClearedSessionCookie()).toContain('Max-Age=0');
    const req = { headers: { cookie: `other=1; ${buildSessionCookie('abc').split(';')[0]}; x=y` } };
    expect(readSessionCookie(req)).toBe('abc');
    expect(readSessionCookie({ headers: {} })).toBeNull();
  });
});

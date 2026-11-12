/**
 * Server-side sessions (docs/backend-migration.md §4).
 *
 * Cookie value = opaque 256-bit token; DB stores its HMAC. Sessions expire
 * after 14 days with sliding renewal (throttled to at most one DB write per
 * hour per session). `getSessionUser` is the single source of truth for "who
 * is signed in" — it validates expiry and account status, and revokes the
 * session when the account can no longer sign in.
 */

import { and, eq, ne, sql } from 'drizzle-orm';
import { sessions, users } from '../../db/schema.ts';
import type { Db } from './db.ts';
import { HttpError } from './env.ts';
import { hmacToken, randomToken } from './crypto.ts';
import { SESSION_TTL_SECONDS } from './cookies.ts';

const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
const TOUCH_THRESHOLD_MS = 60 * 60 * 1000; // slide at most once per hour
/** Hard cap: a session can never be extended beyond 30 days after creation. */
const SESSION_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export interface SessionUser {
  sessionId: string;
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  /** When the session was created (absolute-lifetime anchor). */
  createdAt: Date;
  /** When the account was created (shown in the console profile). */
  userCreatedAt: Date;
  lastLoginAt: Date | null;
  expiresAt: Date;
}

export async function createSession(
  db: Db,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null; rotatedFrom?: string | null } = {},
): Promise<CreatedSession> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    userId,
    tokenHash: hmacToken(token),
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    rotatedFrom: meta.rotatedFrom ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

/** Resolves the cookie token to an active session + user, or throws 401. */
export async function getSessionUser(db: Db, rawToken: string | null): Promise<SessionUser> {
  if (!rawToken) {
    throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');
  }
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      userCreatedAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, hmacToken(rawToken)))
    .limit(1);

  const row = rows[0];
  const expired = !row || new Date(row.expiresAt).getTime() <= Date.now();
  const absoluteExpiry = row ? new Date(row.createdAt).getTime() + SESSION_ABSOLUTE_TTL_MS : 0;
  if (expired || (row && absoluteExpiry <= Date.now())) {
    if (row) await revokeSessionByHash(db, rawToken); // expired → clean up
    throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');
  }
  if (row.status === 'suspended') {
    await revokeSessionByHash(db, rawToken);
    throw new HttpError(403, 'account_suspended', 'This account is suspended.');
  }
  if (row.status === 'deleted') {
    await revokeSessionByHash(db, rawToken);
    throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');
  }

  // Sliding renewal — throttle writes to once per hour and never extend past
  // the absolute lifetime, so stolen cookies cannot stay alive forever.
  if (Date.now() - new Date(row.lastSeenAt).getTime() > TOUCH_THRESHOLD_MS) {
    const nextExpiry = new Date(Math.min(Date.now() + SESSION_TTL_MS, absoluteExpiry));
    await db
      .update(sessions)
      .set({ lastSeenAt: sql`now()`, expiresAt: nextExpiry })
      .where(eq(sessions.id, row.sessionId));
    row.expiresAt = nextExpiry;
  }

  return {
    ...row,
    createdAt: new Date(row.createdAt),
    userCreatedAt: new Date(row.userCreatedAt),
  };
}

export async function revokeSessionByHash(db: Db, rawToken: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hmacToken(rawToken)));
}

/** Signs out every other device/session; optionally keeps the current one. */
export async function revokeOtherSessions(
  db: Db,
  userId: string,
  keepToken: string | null,
): Promise<void> {
  if (keepToken) {
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, hmacToken(keepToken))));
  } else {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}

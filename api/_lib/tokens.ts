/**
 * Single-use emailed tokens (email verification + password reset).
 *
 * Raw token (256-bit) is returned to the caller for the email link; only its
 * HMAC lives in the DB. Consuming is one statement (`update ... where used_at
 * is null and expires_at > now returning`) — atomic single-use without
 * transactions. Purposes are enforced: a reset token can never verify an
 * email and vice versa.
 */

import { and, eq, isNull, sql } from 'drizzle-orm';
import { emailTokens, users } from '../../db/schema.ts';
import type { Db } from './db.ts';
import { HttpError } from './env.ts';
import { hmacToken, randomToken } from './crypto.ts';

export type EmailTokenPurpose = 'verify_email' | 'reset_password';

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/** Creates a single-use token row and returns the raw token for the email. */
export async function createEmailToken(
  db: Db,
  userId: string,
  purpose: EmailTokenPurpose,
  ttlMs: number,
): Promise<IssuedToken> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(emailTokens).values({
    userId,
    purpose,
    tokenHash: hmacToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export interface ConsumedToken {
  userId: string;
}

/**
 * Atomically consumes a token: single-use (used_at flips only for the first
 * caller), expiry-enforced, purpose-checked. Throws a generic 400 otherwise —
 * never reveals which check failed.
 */
export async function consumeEmailToken(
  db: Db,
  rawToken: string,
  purpose: EmailTokenPurpose,
): Promise<ConsumedToken> {
  const rows = await db
    .update(emailTokens)
    .set({ usedAt: sql`now()` })
    .where(
      and(
        eq(emailTokens.tokenHash, hmacToken(rawToken)),
        eq(emailTokens.purpose, purpose),
        isNull(emailTokens.usedAt),
        sql`${emailTokens.expiresAt} > now()`,
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    throw new HttpError(
      400,
      'invalid_token',
      'This link is invalid or has expired. Please request a new one.',
    );
  }
  return { userId: row.userId };
}

/** Removes leftover used/expired token rows for one user (housekeeping). */
export async function purgeUserTokens(db: Db, userId: string): Promise<void> {
  await db
    .delete(emailTokens)
    .where(
      and(
        eq(emailTokens.userId, userId),
        sql`(${emailTokens.usedAt} is not null or ${emailTokens.expiresAt} < now())`,
      ),
    );
}

/** Convenience: user lookup by id, thin wrapper for service code. */
export async function findUserById(db: Db, userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

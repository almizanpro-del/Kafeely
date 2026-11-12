/**
 * Scheduled housekeeping (run by Vercel Cron, see vercel.json).
 *
 * The product promises a 30-day erasure window, and several tables grow
 * without bound unless someone prunes them. A single invocation performs a
 * handful of set-based deletes — no per-row loops, no transaction needed.
 */

import { sql } from 'drizzle-orm';
import {
  emailTokens,
  rateLimitHits,
  sessions,
  users,
  waitlistEntries,
} from '../../../db/schema.ts';
import type { Db } from '../db.ts';

export const ERASURE_GRACE_DAYS = 30;

export interface PurgeResult {
  sessions: number;
  emailTokens: number;
  rateLimitWindows: number;
  erasedUsers: number;
  erasedWaitlist: number;
  clearedWaitlistTokens: number;
}

/** Runs every cleanup step and returns row counts (for logs/tests). */
export async function purgeExpired(db: Db): Promise<PurgeResult> {
  const deletedSessions = await db
    .delete(sessions)
    .where(sql`${sessions.expiresAt} < now()`)
    .returning();

  const deletedTokens = await db
    .delete(emailTokens)
    .where(sql`(${emailTokens.usedAt} is not null or ${emailTokens.expiresAt} < now())`)
    .returning();

  const deletedWindows = await db
    .delete(rateLimitHits)
    .where(sql`${rateLimitHits.windowStart} < now() - interval '24 hours'`)
    .returning();

  // FR-24: the soft-deleted account is hard-deleted once the grace window ends.
  const erasedUsers = await db
    .delete(users)
    .where(
      sql`${users.status} = 'deleted' and ${users.deletedAt} is not null
          and ${users.deletedAt} < now() - interval '${sql.raw(String(ERASURE_GRACE_DAYS))} days'`,
    )
    .returning();

  const erasedWaitlist = await db
    .delete(waitlistEntries)
    .where(
      sql`${waitlistEntries.deletedAt} is not null
          and ${waitlistEntries.deletedAt} < now() - interval '${sql.raw(String(ERASURE_GRACE_DAYS))} days'`,
    )
    .returning();

  // Expired double opt-in links can no longer be used; drop the hash so a
  // stale record is not retained as an authentication artefact.
  const clearedTokens = await db
    .update(waitlistEntries)
    .set({ verificationTokenHash: null, verificationExpiresAt: null })
    .where(
      sql`${waitlistEntries.verificationTokenHash} is not null
          and ${waitlistEntries.verificationExpiresAt} < now()`,
    )
    .returning();

  return {
    sessions: deletedSessions.length,
    emailTokens: deletedTokens.length,
    rateLimitWindows: deletedWindows.length,
    erasedUsers: erasedUsers.length,
    erasedWaitlist: erasedWaitlist.length,
    clearedWaitlistTokens: clearedTokens.length,
  };
}

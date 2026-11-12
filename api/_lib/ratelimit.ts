/**
 * Fixed-window rate limiting backed by Postgres (docs/backend-migration.md §4).
 *
 * A single atomic upsert per check: insert count=1 or increment, RETURNING the
 * new count — correct under concurrency without transactions. Over the limit
 * → HTTP 429. Old windows are purged lazily (2% of calls) so the table stays
 * tiny without a cron.
 */

import { lt, sql } from 'drizzle-orm';
import { rateLimitHits } from '../../db/schema.ts';
import type { Db } from './db.ts';
import { HttpError } from './env.ts';

export interface RateLimitResult {
  count: number;
  limit: number;
}

/** Throws HttpError(429) when `limit` is exceeded within the window. */
export async function rateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(nowMs / windowMs) * windowMs);

  const rows = await db
    .insert(rateLimitHits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitHits.key, rateLimitHits.windowStart],
      set: { count: sql`${rateLimitHits.count} + 1` },
    })
    .returning();

  const count = rows[0]?.count ?? 1;
  if (count > limit) {
    throw new HttpError(
      429,
      'rate_limited',
      'Too many requests. Please wait a moment and try again.',
    );
  }

  if (Math.random() < 0.02) {
    const cutoff = new Date(nowMs - 24 * 60 * 60 * 1000);
    await db.delete(rateLimitHits).where(lt(rateLimitHits.windowStart, cutoff));
  }

  return { count, limit };
}

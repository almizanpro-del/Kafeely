/**
 * GET /api/health — liveness + database connectivity probe.
 * Used by CI smoke checks and by Vercel/uptime monitors. Returns 503 (not a
 * crash) when the backend is not configured yet, so previews stay green.
 */

import { sql } from 'drizzle-orm';
import { getDb } from './_lib/db.ts';
import { assertMethod, clientIp, toHandler } from './_lib/http.ts';
import { HttpError } from './_lib/env.ts';

/**
 * Per-instance throttle. The health probe hits the database, so leaving it
 * unthrottled lets anyone turn monitoring into a DB-connection amplifier.
 * In-memory is enough here: each lambda instance caps its own callers without
 * adding another database round-trip to the very endpoint that checks the DB.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, { windowStart: number; count: number }>();

function throttle(ip: string | null): void {
  const key = ip ?? 'unknown';
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(key, { windowStart: now, count: 1 });
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (now - v.windowStart >= WINDOW_MS) hits.delete(k);
    }
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    throw new HttpError(429, 'rate_limited', 'Too many health checks. Try again in a minute.');
  }
}

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'GET');
  throttle(clientIp(req));

  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      status: 'degraded',
      db: 'not_configured',
      hint: 'Set DATABASE_URL (Neon pooled connection string) — docs/backend-migration.md Phase 0.',
    });
    return;
  }

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    console.error('[health] db check failed:', error);
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

export default handler;

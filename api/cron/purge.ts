/**
 * GET /api/cron/purge — scheduled retention/cleanup job.
 *
 * Authorisation: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when
 * the CRON_SECRET env var is configured. Missing configuration fails closed
 * (503) rather than exposing an unauthenticated delete endpoint.
 */

import type { VercelRequest } from '@vercel/node';
import { getDb } from '../_lib/db.ts';
import { HttpError } from '../_lib/env.ts';
import { assertMethod, toHandler } from '../_lib/http.ts';
import { safeEqual } from '../_lib/crypto.ts';
import { purgeExpired } from '../_lib/services/maintenance.ts';

function assertCronAuthorized(req: VercelRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new HttpError(503, 'cron_not_configured', 'CRON_SECRET is not set.');
  }
  const header = req.headers.authorization;
  const provided = String(Array.isArray(header) ? header[0] : header ?? '').replace(
    /^Bearer\s+/i,
    '',
  );
  if (!provided || !safeEqual(provided, secret)) {
    throw new HttpError(401, 'unauthorized', 'Invalid cron credentials.');
  }
}

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'GET');
  assertCronAuthorized(req);

  const result = await purgeExpired(getDb());
  console.log('[cron] purge complete', result);
  res.status(200).json({ ok: true, ...result });
});

export default handler;

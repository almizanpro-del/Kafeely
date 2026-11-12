/**
 * GET /api/admin/audit — server-side audit trail (docs/backend-migration.md §6).
 *
 * Active staff and Super-Admins may read (the console's Compliance Audit
 * Trail tab is visible to every signed-in member). Newest first, capped at
 * 500 rows per call; the client merges this with its local-era entries.
 */

import { getDb } from '../_lib/db.ts';
import { readSessionCookie } from '../_lib/cookies.ts';
import { assertMethod, assertSameOrigin, toHandler } from '../_lib/http.ts';
import { requireActiveStaff } from '../_lib/guards.ts';
import { listAudit } from '../_lib/services/team.ts';

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'GET');
  assertSameOrigin(req);
  await requireActiveStaff(getDb(), readSessionCookie(req));

  const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 200;
  const logs = await listAudit(getDb(), limit);
  res.status(200).json({ logs });
});

export default handler;

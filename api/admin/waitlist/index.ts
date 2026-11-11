/**
 * GET  /api/admin/waitlist — waitlist records for the console.
 * POST /api/admin/waitlist — logs a CSV export (FR-21), body: { count }.
 *
 * Any active staff member may read records; only Super-Admins may erase them
 * (see ./[id].ts).
 */

import { getDb } from '../../_lib/db.ts';
import { readSessionCookie } from '../../_lib/cookies.ts';
import { assertMethod, assertSameOrigin, readJsonBody, toHandler } from '../../_lib/http.ts';
import { requireActiveStaff } from '../../_lib/guards.ts';
import { listWaitlist, logWaitlistExport } from '../../_lib/services/waitlist.ts';
import { exportLogSchema } from '../../_lib/validation.ts';

const handler = toHandler(async (req, res) => {
  const db = getDb();
  const actor = await requireActiveStaff(db, readSessionCookie(req));

  if (req.method === 'POST') {
    assertSameOrigin(req);
    const { count } = exportLogSchema.parse(await readJsonBody(req));
    await logWaitlistExport(db, actor.email, count);
    res.status(202).json({ ok: true });
    return;
  }

  assertMethod(req, 'GET');
  const entries = await listWaitlist(db);
  res.status(200).json({ entries, actor: { id: actor.id, email: actor.email, role: actor.role } });
});

export default handler;

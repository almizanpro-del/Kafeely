/**
 * DELETE /api/admin/waitlist/:id — right-of-erasure (UAE PDPL, FR-24).
 * Super-Admin only; the record is hard-deleted and the audit entry carries no
 * personal data.
 */

import { getDb } from '../../_lib/db.ts';
import { readSessionCookie } from '../../_lib/cookies.ts';
import { assertMethod, assertSameOrigin, toHandler } from '../../_lib/http.ts';
import { requireSuperAdmin } from '../../_lib/guards.ts';
import { deleteWaitlistEntry } from '../../_lib/services/waitlist.ts';

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'DELETE');
  assertSameOrigin(req);

  const db = getDb();
  const actor = await requireSuperAdmin(db, readSessionCookie(req));
  const id = String(req.query.id ?? '');

  const result = await deleteWaitlistEntry(db, id, `${actor.email} (${actor.role})`);
  res.status(200).json(result);
});

export default handler;

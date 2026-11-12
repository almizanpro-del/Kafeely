/**
 * GET /api/admin/team — console account list (docs/backend-migration.md §6).
 *
 * Super-Admin only. Returns all non-deleted accounts (pending, active,
 * suspended) as hash-free public rows for the Team & Access tab.
 */

import { getDb } from '../../_lib/db.ts';
import { readSessionCookie } from '../../_lib/cookies.ts';
import { assertMethod, assertSameOrigin, toHandler } from '../../_lib/http.ts';
import { requireSuperAdmin } from '../../_lib/guards.ts';
import { listTeam } from '../../_lib/services/team.ts';

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'GET');
  assertSameOrigin(req);
  const actor = await requireSuperAdmin(getDb(), readSessionCookie(req));
  const team = await listTeam(getDb());
  res.status(200).json({
    team,
    actor: { id: actor.id, email: actor.email, role: actor.role },
  });
});

export default handler;

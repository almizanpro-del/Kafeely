/**
 * PATCH /api/admin/team/:id — manage a console account
 * (docs/backend-migration.md §6 "Team list; approve/suspend pending accounts").
 *
 * Body: { action: 'approve' | 'suspend' | 'reactivate' | 'promote' | 'reset' | 'delete' }
 *
 * Super-Admin only, server-enforced. Every rule the demo UI enforced
 * (self-protection, last-Super-Admin protection, status transitions) is
 * re-checked here; suspend/remove revoke the member's sessions immediately,
 * and every action writes the matching ADMIN_* audit entry.
 */

import { getDb } from '../../_lib/db.ts';
import { readSessionCookie } from '../../_lib/cookies.ts';
import {
  assertMethod,
  assertSameOrigin,
  readJsonBody,
  toHandler,
} from '../../_lib/http.ts';
import { getMailer } from '../../_lib/mailer.ts';
import { requireSuperAdmin } from '../../_lib/guards.ts';
import { teamAction } from '../../_lib/services/team.ts';
import { teamActionSchema } from '../../_lib/validation.ts';

const handler = toHandler(async (req, res) => {
  assertMethod(req, 'PATCH');
  assertSameOrigin(req);

  const db = getDb();
  const actor = await requireSuperAdmin(db, readSessionCookie(req));

  const targetId = String(req.query.id ?? '');
  const { action } = teamActionSchema.parse(await readJsonBody(req));

  const result = await teamAction(db, actor, targetId, action, {
    mailer: getMailer(),
  });

  res.status(200).json(result);
});

export default handler;

/**
 * Authorisation guards (docs/backend-migration.md §6 "Admin console"):
 * a single server-side enforcement point for console endpoints. The
 * client-side role checks in AdminPortal are UX only — these guards are the
 * real gate.
 */

import type { Db } from './db.ts';
import { HttpError } from './env.ts';
import { getSessionUser, type SessionUser } from './session.ts';

/** Any signed-in account with an active status (staff or Super-Admin). */
export async function requireActiveStaff(db: Db, rawToken: string | null): Promise<SessionUser> {
  const session = await getSessionUser(db, rawToken);
  if (session.status !== 'active') {
    throw new HttpError(403, 'account_not_active', 'This account cannot use the console yet.');
  }
  return session;
}

/** Super-Admin only (team management, exports, …). */
export async function requireSuperAdmin(db: Db, rawToken: string | null): Promise<SessionUser> {
  const session = await requireActiveStaff(db, rawToken);
  if (session.role !== 'super_admin') {
    throw new HttpError(403, 'forbidden', 'Super-Admin access is required for this action.');
  }
  return session;
}

/**
 * Team & audit services (docs/backend-migration.md §6 "Admin console"):
 * server-enforced management of console accounts plus the audit trail read.
 *
 * Every action re-checks the rules that the demo phase enforced client-side
 * (self-protection, last-Super-Admin protection, status transitions) and
 * writes the matching ADMIN_* audit entry so the console trail keeps its
 * vocabulary across the demo → backend cutover.
 */

import { asc, desc, eq, ne, sql, and } from 'drizzle-orm';
import { auditLogs, users } from '../../../db/schema.ts';
import type { Db } from '../db.ts';
import { HttpError, siteUrl } from '../env.ts';
import { writeAudit } from '../audit.ts';
import { emailHtml, escapeHtml, type Mailer } from '../mailer.ts';
import { createEmailToken, RESET_TOKEN_TTL_MS } from '../tokens.ts';
import { revokeOtherSessions, type SessionUser } from '../session.ts';

export type TeamActionType = 'approve' | 'suspend' | 'reactivate' | 'promote' | 'reset' | 'delete';

/** Client-shaped team member (Team tab table row) — no hash material. */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Client-shaped audit entry (Compliance Audit Trail row). */
export interface AuditEntryView {
  id: string;
  action: string;
  performedBy: string;
  targetEmail: string | null;
  role: string | null;
  details: string;
  createdAt: string;
}

export async function listTeam(db: Db): Promise<TeamMember[]> {
  const rows = await db
    .select()
    .from(users)
    .where(ne(users.status, 'deleted'))
    .orderBy(asc(users.createdAt));
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: new Date(u.createdAt).toISOString(),
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
  }));
}

export async function listAudit(db: Db, limit = 200): Promise<AuditEntryView[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    performedBy: row.performedBy,
    targetEmail: row.targetEmail,
    role: row.role,
    details: row.details,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* Team actions                                                        */
/* ------------------------------------------------------------------ */

async function loadTarget(db: Db, targetId: string) {
  if (!/^[0-9a-f-]{16,64}$/i.test(targetId)) {
    throw new HttpError(422, 'validation_error', 'Unknown account.');
  }
  const rows = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  const target = rows[0];
  if (!target || target.status === 'deleted') {
    throw new HttpError(404, 'account_not_found', 'Account not found.');
  }
  return target;
}

function assertNotSelf(actor: SessionUser, target: { id: string }): void {
  if (actor.id === target.id) {
    throw new HttpError(
      400,
      'self_action',
      'You cannot perform this action on your own account. Use the key icon to change your password.',
    );
  }
}

/**
 * SQL condition asserting that demoting/removing the target row still leaves
 * at least one other active Super-Admin. Folded into the UPDATE/DELETE so the
 * check and the write are one atomic statement (no TOCTOU window).
 */
function leavesAnotherSuperAdmin(): ReturnType<typeof sql> {
  return sql`(${users.role} <> 'super_admin' or exists (
    select 1 from users other
    where other.role = 'super_admin' and other.status = 'active' and other.id <> ${users.id}
  ))`;
}

const LAST_SUPER_ADMIN_MESSAGE =
  'Cannot remove the only active Super-Admin account. Promote or reactivate another Super-Admin first.';

export interface TeamActionMeta {
  mailer: Mailer;
  /** Base URL for links inside emails, e.g. https://kafeely.com */
  linkBase?: string | null;
}

export async function teamAction(
  db: Db,
  actor: SessionUser,
  targetId: string,
  action: TeamActionType,
  meta: TeamActionMeta,
): Promise<{ message: string }> {
  const target = await loadTarget(db, targetId);
  assertNotSelf(actor, target);

  switch (action) {
    case 'approve': {
      if (target.status !== 'pending') {
        throw new HttpError(400, 'bad_status', 'Only pending accounts can be approved.');
      }
      await db.update(users).set({ status: 'active' }).where(eq(users.id, target.id));
      await writeAudit(db, {
        action: 'ADMIN_ACCOUNT_APPROVED',
        performedBy: actor.email,
        targetEmail: target.email,
        targetId: target.id,
        role: target.role,
        details: 'Account approved by the Super-Admin. The member can sign in once their email is verified.',
      });
      return { message: `${target.email} was approved. They can sign in once their email is verified.` };
    }

    case 'suspend': {
      if (target.status !== 'active') {
        throw new HttpError(400, 'bad_status', 'Only active accounts can be suspended.');
      }
      const updated = await db
        .update(users)
        .set({ status: 'suspended' })
        .where(and(eq(users.id, target.id), leavesAnotherSuperAdmin()))
        .returning();
      if (!updated[0]) {
        throw new HttpError(400, 'last_super_admin', LAST_SUPER_ADMIN_MESSAGE);
      }
      await revokeOtherSessions(db, target.id, null);
      await writeAudit(db, {
        action: 'ADMIN_ACCOUNT_SUSPENDED',
        performedBy: actor.email,
        targetEmail: target.email,
        targetId: target.id,
        role: target.role,
        details: 'Account suspended by the Super-Admin. Sign-in is blocked and all sessions were revoked.',
      });
      return { message: `${target.email} was suspended. Their sessions were signed out.` };
    }

    case 'promote': {
      if (target.role === 'super_admin') {
        throw new HttpError(400, 'bad_status', 'This account is already a Super-Admin.');
      }
      if (target.status !== 'active') {
        throw new HttpError(400, 'bad_status', 'Only active accounts can be promoted to Super-Admin.');
      }
      await db.update(users).set({ role: 'super_admin' }).where(eq(users.id, target.id));
      await writeAudit(db, {
        action: 'ADMIN_ACCOUNT_PROMOTED',
        performedBy: actor.email,
        targetEmail: target.email,
        targetId: target.id,
        role: 'super_admin',
        details: 'Staff account promoted to Super-Admin. Full console management rights granted.',
      });
      return { message: `${target.email} is now a Super-Admin.` };
    }

    case 'reactivate': {
      if (target.status !== 'suspended') {
        throw new HttpError(400, 'bad_status', 'Only suspended accounts can be reactivated.');
      }
      await db.update(users).set({ status: 'active' }).where(eq(users.id, target.id));
      await writeAudit(db, {
        action: 'ADMIN_ACCOUNT_REACTIVATED',
        performedBy: actor.email,
        targetEmail: target.email,
        targetId: target.id,
        role: target.role,
        details: 'Account reactivated by the Super-Admin. Sign-in access restored.',
      });
      return { message: `${target.email} was reactivated. Sign-in access is restored.` };
    }

    case 'reset': {
      if (target.status !== 'active') {
        throw new HttpError(400, 'bad_status', 'Only active accounts can receive a password reset.');
      }
      if (!target.emailVerifiedAt) {
        throw new HttpError(
          400,
          'email_unverified',
          'This member has not verified their email yet — they can use "Forgot password" on the sign-in screen after verifying.',
        );
      }
      const issued = await createEmailToken(db, target.id, 'reset_password', RESET_TOKEN_TTL_MS);
      const linkBase = (meta.linkBase ?? siteUrl()).replace(/\/+$/, '');
      try {
        await meta.mailer.send({
          to: target.email,
          subject: 'Reset your password — Kafeely Console',
          html: emailHtml(
            'Reset your password',
            `<p>Hello ${escapeHtml(target.name)},</p>
             <p>The Super-Admin initiated a password reset for your console account. Use the button below to
             choose a new password. The link is single-use and expires in 15 minutes, and it signs out all
             other devices.</p>
             <p style="font-size:12px;color:#475569">Or paste this one-time token into the reset form:<br>
             <code>${issued.token}</code></p>`,
            `${linkBase}/#reset-password?token=${encodeURIComponent(issued.token)}`,
          ),
        });
      } catch (error) {
        console.error('[team] password reset email failed:', error);
        throw new HttpError(
          502,
          'email_failed',
          'The reset email could not be sent. Check the mail provider configuration and try again.',
        );
      }
      await writeAudit(db, {
        action: 'ADMIN_PASSWORD_RESET_BY_ADMIN',
        performedBy: actor.email,
        targetEmail: target.email,
        targetId: target.id,
        role: target.role,
        details: 'Password reset initiated by the Super-Admin. A single-use reset link was emailed to the member.',
      });
      return { message: `A reset link was emailed to ${target.email}. It is single-use and valid for 15 minutes.` };
    }

    case 'delete': {
      const updated = await db
        .update(users)
        .set({ status: 'deleted', deletedAt: sql`now()` })
        .where(and(eq(users.id, target.id), leavesAnotherSuperAdmin()))
        .returning();
      if (!updated[0]) {
        throw new HttpError(400, 'last_super_admin', LAST_SUPER_ADMIN_MESSAGE);
      }
      await revokeOtherSessions(db, target.id, null);
      await writeAudit(db, {
        action: 'ADMIN_ACCOUNT_DELETED',
        performedBy: actor.email,
        targetEmail: target.email,
        targetId: target.id,
        role: target.role,
        details:
          'Console account removed by the Super-Admin. Credentials are disabled immediately; personal data follows the 30-day erasure policy.',
      });
      return { message: `${target.email} was removed from the console. Waitlist records are unaffected.` };
    }

    default: {
      throw new HttpError(422, 'validation_error', 'Unknown team action.');
    }
  }
}

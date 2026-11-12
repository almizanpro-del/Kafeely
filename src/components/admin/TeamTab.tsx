/**
 * Super-Admin console — Team & Access tab (Super-Admin only).
 *
 * Extracted from the former AdminPortal monolith (code-review fix:
 * "component splitting"). Owns the confirmation copy for every team action
 * and the confirmation modal; the actual auth operations stay in
 * AdminPortal (they need the session and refresh both tabs).
 */
import React from 'react';
import { AdminUser } from '../../types';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';

export type TeamActionType = 'approve' | 'suspend' | 'promote' | 'reactivate' | 'reset' | 'delete';

export interface PendingTeamAction {
  type: TeamActionType;
  user: AdminUser;
}

export const actionCopy: Record<
  TeamActionType,
  { title: string; body: (email: string) => string; confirmLabel: string; danger?: boolean }
> = {
  approve: {
    title: 'Approve Account',
    body: (email) =>
      `Approve ${email}? The member will be able to sign in immediately with the password chosen at registration.`,
    confirmLabel: 'Approve Account',
  },
  suspend: {
    title: 'Suspend Account',
    body: (email) =>
      `Suspend ${email}? Sign-in will be blocked until the account is reactivated. This does not affect waitlist records.`,
    confirmLabel: 'Suspend',
    danger: true,
  },
  promote: {
    title: 'Promote to Super-Admin',
    body: (email) =>
      `Promote ${email} to Super-Admin? They gain full console powers: team management, record erasure and audit access. This cannot be undone from the console.`,
    confirmLabel: 'Promote',
  },
  reactivate: {
    title: 'Reactivate Account',
    body: (email) => `Reactivate ${email}? Sign-in access will be restored immediately.`,
    confirmLabel: 'Reactivate',
  },
  reset: {
    title: 'Reset Password',
    body: (email) =>
      `Email a single-use reset link to ${email}? Their current password keeps working until they actually set a new one.`,
    confirmLabel: 'Email Reset Link',
  },
  delete: {
    title: 'Remove Account',
    body: (email) =>
      `Permanently remove the console account ${email}? Only the credentials are deleted — waitlist records are not affected.`,
    confirmLabel: 'Remove Account',
    danger: true,
  },
};

const statusPill = (status: AdminUser['status']) => {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <Clock className="h-3 w-3" />
        Pending approval
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
      <Ban className="h-3 w-3" />
      Suspended
    </span>
  );
};

export const TeamTab: React.FC<{
  users: AdminUser[];
  sessionEmail: string;
  onAction: (action: PendingTeamAction) => void;
  onRefresh: () => void;
}> = ({ users, sessionEmail, onAction, onRefresh }) => (
  <div className="space-y-3">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
      <div className="text-xs text-slate-400">
        Console accounts. New registrations start as <span className="text-amber-400">pending</span>, verify their
        email by the link we send, and need approval here before they can sign in. Passwords are hashed
        server-side (argon2id) — they can never be viewed, only reset by email.
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </div>
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/30">
      <table className="w-full text-start text-xs">
        <thead className="border-b border-slate-800 text-slate-400 font-medium">
          <tr>
            <th className="py-3 px-3 text-start">Member</th>
            <th className="py-3 px-3 text-start">Role</th>
            <th className="py-3 px-3 text-start">Status</th>
            <th className="py-3 px-3 text-start">Registered</th>
            <th className="py-3 px-3 text-start">Last Sign-In</th>
            <th className="py-3 px-3 text-end">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-sans">
          {users.map((user) => {
            const isSelf = sessionEmail === user.email;
            return (
              <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-white">
                    {user.name}
                    {isSelf && <span className="ms-1.5 text-[10px] font-mono text-[#C5A880]">(you)</span>}
                  </div>
                  <div className="text-[11px] text-slate-400">{user.email}</div>
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-slate-300">
                    {user.role === 'super_admin' ? 'Super-Admin' : 'Staff'}
                  </span>
                </td>
                <td className="py-3 px-3 whitespace-nowrap">{statusPill(user.status)}</td>
                <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                  {user.createdAt.slice(0, 10)}
                </td>
                <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                  {user.lastLoginAt ? user.lastLoginAt.slice(0, 10) : '—'}
                </td>
                <td className="py-3 px-3 text-end whitespace-nowrap">
                  {isSelf ? (
                    <span className="text-[11px] text-slate-500">Use the key icon to change your password</span>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      {user.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onAction({ type: 'approve', user })}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors"
                          title="Approve this account"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      )}
                      {user.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => onAction({ type: 'suspend', user })}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-950/40 hover:text-amber-300 transition-colors"
                          title="Suspend sign-in access"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}
                      {user.status === 'suspended' && (
                        <button
                          type="button"
                          onClick={() => onAction({ type: 'reactivate', user })}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors"
                          title="Restore sign-in access"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reactivate</span>
                        </button>
                      )}
                      {user.status === 'active' && user.role !== 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => onAction({ type: 'promote', user })}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-sky-400 hover:bg-sky-950/40 hover:text-sky-300 transition-colors"
                          title="Grant full Super-Admin rights"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Promote</span>
                        </button>
                      )}
                      {user.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => onAction({ type: 'reset', user })}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                          title="Issue a one-time temporary password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Reset Password</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onAction({ type: 'delete', user })}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                        title="Permanently remove this console account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

/** Confirmation dialog for a pending team action. */
export const TeamActionModal: React.FC<{
  action: PendingTeamAction;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel: string;
}> = ({ action, error, onCancel, onConfirm, cancelLabel }) => (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div
      className={`w-full max-w-md rounded-xl border bg-[#0E1524] p-6 shadow-2xl ${
        actionCopy[action.type].danger ? 'border-red-900/80' : 'border-slate-700'
      }`}
    >
      <div
        className={`flex items-center gap-2.5 font-serif font-bold text-lg mb-2 ${
          actionCopy[action.type].danger ? 'text-red-400' : 'text-[#C5A880]'
        }`}
      >
        <AlertTriangle className="h-5 w-5" />
        <h4>{actionCopy[action.type].title}</h4>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed mb-4">{actionCopy[action.type].body(action.user.email)}</p>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 leading-relaxed">{error}</p>
        </div>
      )}
      <div className="flex justify-end gap-2.5">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-white">
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
            actionCopy[action.type].danger
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-[#C5A880] text-[#0B132B] hover:bg-[#D5BD97]'
          }`}
        >
          {actionCopy[action.type].confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

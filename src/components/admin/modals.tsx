/**
 * Super-Admin console — shared dialog shells.
 *
 * Extracted from the former ~970-line AdminPortal monolith (code-review fix:
 * "component splitting"). Each modal is self-contained: the change-password
 * form owns its field state, the one-time-secret dialog owns its clipboard
 * state, and AdminPortal only orchestrates which dialog is open.
 */
import React, { useState } from 'react';
import { content } from '../../content/translations';
import { changeOwnPassword, passwordPolicy } from '../../utils/auth';
import { errorMessage } from '../../utils/apiClient';
import { AlertTriangle, Check, Copy, KeyRound } from 'lucide-react';

type AdminCopy = typeof content.en.admin;

/** Shared dark overlay + card shell used by every console dialog. */
const ModalShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    {children}
  </div>
);

export interface TempSecret {
  title: string;
  code: string;
  warning: string;
}

/* ------------------------------------------------------------------ */
/* Data-erasure confirmation (UAE PDPL FR-24)                          */
/* ------------------------------------------------------------------ */

export const DeleteRecordModal: React.FC<{
  candidateEmail: string;
  candidateRole: string;
  onCancel: () => void;
  onConfirm: () => void;
  t: AdminCopy;
}> = ({ candidateEmail, candidateRole, onCancel, onConfirm, t }) => (
  <ModalShell>
    <div className="w-full max-w-md rounded-xl border border-red-900/80 bg-[#0E1524] p-6 shadow-2xl">
      <div className="flex items-center gap-2.5 text-red-400 font-serif font-bold text-lg mb-2">
        <AlertTriangle className="h-5 w-5" />
        <h4>{t.deleteModalTitle}</h4>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed mb-4">{t.deleteModalDesc}</p>
      <div className="rounded border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-slate-300 mb-5 font-mono">
        {candidateEmail} ({candidateRole})
      </div>
      <div className="flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-white"
        >
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
        >
          {t.confirmDelete}
        </button>
      </div>
    </div>
  </ModalShell>
);

/* ------------------------------------------------------------------ */
/* One-time secret (temporary password / recovery code)                */
/* ------------------------------------------------------------------ */

export const TempSecretModal: React.FC<{
  secret: TempSecret;
  onClose: () => void;
}> = ({ secret, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(secret.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — code remains visible */
    }
  };

  // The dialog doubles as a server-notice shell (e.g. "reset link emailed to
  // <address>") — render an address as text, secrets as a one-time code.
  const isAddress = secret.code.includes('@');

  return (
    <ModalShell>
      <div className="w-full max-w-md rounded-xl border border-[#C5A880]/60 bg-[#0E1524] p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 text-[#C5A880] font-serif font-bold text-lg mb-2">
          <KeyRound className="h-5 w-5" />
          <h4>{secret.title}</h4>
        </div>
        <div className="rounded-lg border border-[#C5A880]/50 bg-[#C5A880]/10 px-4 py-3.5 mb-3 text-center">
          <div
            className={`font-mono font-bold text-[#E8D7B8] select-all ${
              isAddress ? 'text-sm tracking-normal break-all' : 'text-xl tracking-[0.15em]'
            }`}
          >
            {secret.code}
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-2">{secret.warning}</p>
        <p className="text-[11px] text-amber-300 mb-5">
          {isAddress ? 'A private channel is not needed — the link goes straight to the member.' : 'Shown only once — copy it now.'}
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#C5A880] px-4 py-2 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

/* ------------------------------------------------------------------ */
/* Change my password (self-service)                                   */
/* ------------------------------------------------------------------ */

export const ChangePasswordModal: React.FC<{
  onClose: () => void;
  /** Called after a successful change so the shell can refresh the audit list. */
  onAuditRefresh: () => void;
}> = ({ onClose, onAuditRefresh }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = content.en.admin;
  const policy = passwordPolicy(next);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    if (!policy.length) {
      setError('Use at least 12 characters for the new password.');
      return;
    }
    setBusy(true);
    try {
      await changeOwnPassword(current, next);
      onAuditRefresh();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Password change failed unexpectedly.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell>
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0E1524] p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 text-[#C5A880] font-serif font-bold text-lg mb-2">
          <KeyRound className="h-5 w-5" />
          <h4>Change My Password</h4>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Current password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              autoFocus
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#C5A880] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">New password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#C5A880] focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
              <div className={`flex items-center gap-1.5 text-[11px] ${policy.length ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Check className="h-3 w-3" /> 12+ characters
              </div>
              <div className={`flex items-center gap-1.5 text-[11px] ${!policy.predictable ? 'text-emerald-400' : 'text-amber-400'}`}>
                <Check className="h-3 w-3" /> Not a common password
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#C5A880] focus:outline-none"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-[#C5A880] px-4 py-2 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors disabled:opacity-60"
            >
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

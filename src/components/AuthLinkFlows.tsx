/**
 * Email-link flows (docs/backend-migration.md §7).
 *
 * Transactional emails link back to the SPA with one-time tokens in the URL
 * fragment:
 *   #verify-email?token=…    (console account verification — 24 h validity)
 *   #verify-waitlist?token=… (waitlist double opt-in — 48 h validity)
 *   #reset-password?token=…  (forgot-password / admin-issued reset — 15 min)
 *
 * This component watches the fragment, opens the matching dialog, and clears
 * the token from the address bar as soon as it has been captured, so it does
 * not linger in history or screen shares. The tokens are consumed by the API
 * (single-use, hashed at rest) — this component only transports them.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { passwordPolicy, resetPasswordWithToken, verifyEmailWithToken } from '../utils/auth';
import { verifyWaitlistWithToken } from '../utils/waitlist';
import { errorMessage } from '../utils/apiClient';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  MailCheck,
  X,
} from 'lucide-react';

type LinkFlow =
  | { kind: 'reset'; token: string }
  | { kind: 'verify'; token: string }
  | { kind: 'waitlist'; token: string }
  | null;

const inputBase =
  'w-full rounded-lg border bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors';

/** Reads the fragment and maps it to a flow, or null for anything else. */
function flowFromHash(): LinkFlow {
  const raw = window.location.hash;
  const resetMatch = /^#reset-password\?token=(.+)$/i.exec(raw);
  if (resetMatch) return { kind: 'reset', token: decodeURIComponent(resetMatch[1]) };
  const verifyMatch = /^#verify-email\?token=(.+)$/i.exec(raw);
  if (verifyMatch) return { kind: 'verify', token: decodeURIComponent(verifyMatch[1]) };
  const waitlistMatch = /^#verify-waitlist\?token=(.+)$/i.exec(raw);
  if (waitlistMatch) return { kind: 'waitlist', token: decodeURIComponent(waitlistMatch[1]) };
  return null;
}

function clearHash(): void {
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    /* non-fatal */
  }
}

function openConsole(): void {
  try {
    window.location.hash = '#super-admin';
  } catch {
    /* non-fatal */
  }
}

const Shell: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div dir="ltr" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans animate-in fade-in duration-200">
    <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B132B] p-6 shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        className="absolute end-4 top-4 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {children}
    </div>
  </div>
);

export const AuthLinkFlows: React.FC = () => {
  // Lazy initializer: capture + scrub the token at first render (no setState
  // inside the mount effect — the hashchange listener handles later flows).
  const [flow, setFlow] = useState<LinkFlow>(() => {
    const initial = flowFromHash();
    if (initial) {
      clearHash();
    }
    return initial;
  });

  useEffect(() => {
    const openFlow = () => {
      const next = flowFromHash();
      if (next) {
        // Capture the token, then scrub it from the address bar immediately.
        clearHash();
      }
      setFlow(next);
    };
    window.addEventListener('hashchange', openFlow);
    return () => window.removeEventListener('hashchange', openFlow);
  }, []);

  const close = useCallback(() => setFlow(null), []);

  if (!flow) return null;
  if (flow.kind === 'reset') {
    return <ResetPasswordDialog token={flow.token} onClose={close} />;
  }
  if (flow.kind === 'waitlist') {
    return <VerifyWaitlistDialog token={flow.token} onClose={close} />;
  }
  return <VerifyEmailDialog token={flow.token} onClose={close} />;
};

/* ------------------------------------------------------------------ */
/* Reset password (emailed single-use link, 15-minute validity)        */
/* ------------------------------------------------------------------ */

const ResetPasswordDialog: React.FC<{ token: string; onClose: () => void }> = ({ token, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const policy = passwordPolicy(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    if (!policy.length) {
      setError('Use at least 12 characters for the new password.');
      return;
    }
    setBusy(true);
    try {
      const message = await resetPasswordWithToken(token, password);
      setDone(message);
    } catch (err) {
      setError(errorMessage(err, 'The reset failed. Request a fresh link if this one has expired.'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Shell onClose={onClose}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
            <MailCheck className="h-4 w-4" />
          </div>
          <h3 className="font-serif font-bold text-lg text-white">Password updated</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-5">{done}</p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={openConsole}
            className="rounded-lg bg-[#C5A880] px-4 py-2 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors shadow-md"
          >
            Open Console Sign-In
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#C5A880]/20 text-[#C5A880]">
          <KeyRound className="h-4 w-4" />
        </div>
        <h3 className="font-serif font-bold text-lg text-white">Choose a new password</h3>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">
        Your link is single-use and expires 15 minutes after it was issued. All signed-in devices are signed out
        once the new password is saved.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">New password</label>
          <div className="relative">
            <input
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              className={`${inputBase} border-slate-700 focus:border-[#C5A880] pe-10`}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            <Check className="h-3 w-3" aria-hidden="true" />
            <span className={policy.length ? 'text-emerald-400' : 'text-slate-500'}>At least 12 characters</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm new password</label>
          <input
            type={visible ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={`${inputBase} border-slate-700 focus:border-[#C5A880]`}
          />
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#C5A880] px-4 py-2.5 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors shadow-md disabled:opacity-60"
        >
          {busy ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </Shell>
  );
};

/* ------------------------------------------------------------------ */
/* Verify email (emailed single-use link, 24-hour validity)            */
/* ------------------------------------------------------------------ */

const TokenVerifyDialog: React.FC<{
  token: string;
  verify: (token: string) => Promise<string>;
  busyTitle: string;
  doneTitle: string;
  errorFallback: string;
  /** Console accounts get a shortcut into the sign-in dialog. */
  showConsole: boolean;
  onClose: () => void;
}> = ({ token, verify, busyTitle, doneTitle, errorFallback, showConsole, onClose }) => {
  const [state, setState] = useState<'busy' | 'done' | 'error'>('busy');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    verify(token)
      .then((result) => {
        if (cancelled) return;
        setMessage(result);
        setState('done');
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(errorMessage(err, errorFallback));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, verify, errorFallback]);

  return (
    <Shell onClose={onClose}>
      <div className="flex items-center gap-2.5 mb-1">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            state === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
          }`}
        >
          <BadgeCheck className="h-4 w-4" />
        </div>
        <h3 className="font-serif font-bold text-lg text-white">
          {state === 'busy' ? busyTitle : state === 'done' ? doneTitle : 'Verification failed'}
        </h3>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-5">
        {state === 'busy' ? 'One moment — the one-time link is being checked with the Kafeely API.' : message}
      </p>
      <div className="flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
        >
          Close
        </button>
        {state === 'done' && showConsole && (
          <button
            type="button"
            onClick={openConsole}
            className="rounded-lg bg-[#C5A880] px-4 py-2 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors shadow-md"
          >
            Open Console Sign-In
          </button>
        )}
      </div>
    </Shell>
  );
};

const VerifyEmailDialog: React.FC<{ token: string; onClose: () => void }> = ({ token, onClose }) => (
  <TokenVerifyDialog
    token={token}
    verify={verifyEmailWithToken}
    busyTitle="Verifying your email…"
    doneTitle="Email verified"
    errorFallback="Verification failed. The link may have expired — ask the Super-Admin for help."
    showConsole
    onClose={onClose}
  />
);

/* ------------------------------------------------------------------ */
/* Waitlist double opt-in (emailed single-use link, 48-hour validity)  */
/* ------------------------------------------------------------------ */

const VerifyWaitlistDialog: React.FC<{ token: string; onClose: () => void }> = ({ token, onClose }) => (
  <TokenVerifyDialog
    token={token}
    verify={verifyWaitlistWithToken}
    busyTitle="Confirming your details…"
    doneTitle="Details confirmed"
    errorFallback="This confirmation link is invalid or has expired — please submit the form again."
    showConsole={false}
    onClose={onClose}
  />
);

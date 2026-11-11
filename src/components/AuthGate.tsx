import React, { useEffect, useMemo, useState } from 'react';
import { AdminSession } from '../types';
import {
  fetchBootstrapAvailable,
  passwordPolicy,
  PasswordPolicyResult,
  registerAccount,
  requestPasswordReset,
  signIn,
} from '../utils/auth';
import { errorMessage } from '../utils/apiClient';
import { isValidEmail } from '../utils/validation';
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';

type Mode = 'signin' | 'register' | 'forgot';

interface AuthGateProps {
  onAuthed: (session: AdminSession) => void;
  onClose: () => void;
}

const inputBase =
  'w-full rounded-lg border bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors';

const PolicyChecklist: React.FC<{ password: string }> = ({ password }) => {
  const p: PasswordPolicyResult = useMemo(() => passwordPolicy(password), [password]);
  const rows: Array<{ label: string; ok: boolean }> = [
    { label: 'At least 12 characters', ok: p.length },
    {
      label: 'Not a predictable password (avoid names, kafeely, dubai, qwerty…)',
      ok: password.length === 0 ? false : !p.predictable,
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
      {rows.map((row) => (
        <div key={row.label} className={`flex items-center gap-1.5 text-[11px] ${row.ok ? 'text-emerald-400' : 'text-slate-500'}`}>
          <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
};

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
}> = ({ label, value, onChange, autoComplete, autoFocus }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
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
    </div>
  );
};

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthed, onClose }) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [bootstrapAvailable, setBootstrapAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  // Sign-in fields
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Register fields
  const [rgName, setRgName] = useState('');
  const [rgEmail, setRgEmail] = useState('');
  const [rgPassword, setRgPassword] = useState('');
  const [rgConfirm, setRgConfirm] = useState('');
  const [rgBootstrapToken, setRgBootstrapToken] = useState('');

  // Forgot fields
  const [fpEmail, setFpEmail] = useState('');

  // Does the console have any accounts yet? (drives the bootstrap-token field)
  useEffect(() => {
    let cancelled = false;
    fetchBootstrapAvailable().then((available) => {
      if (!cancelled) {
        setBootstrapAvailable(available);
        if (available) setMode('register');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  /* ---------------- Submit handlers ---------------- */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const session = await signIn(siEmail, siPassword);
      onAuthed(session);
      return;
    } catch (err) {
      setError(errorMessage(err, 'Sign-in failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!isValidEmail(rgEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (rgPassword !== rgConfirm) {
      setError('The passwords do not match.');
      return;
    }
    if (bootstrapAvailable && !rgBootstrapToken.trim()) {
      setError('The one-time bootstrap token is required to create the first Super-Admin account.');
      return;
    }
    setBusy(true);
    try {
      const result = await registerAccount({
        name: rgName,
        email: rgEmail,
        password: rgPassword,
        ...(bootstrapAvailable ? { bootstrapToken: rgBootstrapToken } : {}),
      });
      setRgPassword('');
      setRgConfirm('');
      setRgBootstrapToken('');
      setSiEmail(rgEmail);
      setMode('signin');
      setInfo(
        result.bootstrap
          ? `${result.message} Now sign in with the password you chose.`
          : result.message,
      );
    } catch (err) {
      setError(errorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const message = await requestPasswordReset(fpEmail);
      setInfo(message);
      setFpEmail('');
    } catch (err) {
      setError(errorMessage(err, 'The request failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const firstRunBootstrap = bootstrapAvailable === true;

  return (
    <div dir="ltr" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B132B] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute end-4 top-4 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close Admin Portal"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#C5A880]/20 text-[#C5A880]">
              <Lock className="h-4 w-4" />
            </div>
            <h3 className="font-serif font-bold text-lg text-white">Super-Admin Access</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Restricted internal console. Accounts are personal — do not share credentials.
          </p>

          {/* Mode tabs */}
          <div className="flex gap-1.5 mt-4">
            {(
              [
                { id: 'signin', label: 'Sign In', icon: <LogIn className="h-3.5 w-3.5" /> },
                { id: 'register', label: 'Create Account', icon: <UserPlus className="h-3.5 w-3.5" /> },
                { id: 'forgot', label: 'Forgot Password', icon: <KeyRound className="h-3.5 w-3.5" /> },
              ] as Array<{ id: Mode; label: string; icon: React.ReactNode }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMode(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  mode === tab.id ? 'bg-[#C5A880] text-[#0B132B]' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={mode === 'signin' ? handleSignIn : mode === 'register' ? handleRegister : handleForgot} className="p-6 space-y-4">
          {firstRunBootstrap && mode === 'register' && (
            <div className="rounded-lg border border-[#C5A880]/40 bg-[#C5A880]/10 p-3 text-[11px] text-[#E8D7B8] leading-relaxed">
              No console accounts exist yet. The account you create with your one-time
              <span className="font-bold"> bootstrap token</span> becomes the
              <span className="font-bold"> Super-Admin</span>. Keep that token secret — remove it from the
              server settings once this account exists.
            </div>
          )}

          {bootstrapAvailable === false && mode === 'register' && (
            <div className="rounded-lg border border-[#C5A880]/40 bg-[#C5A880]/10 p-3 text-[11px] text-[#E8D7B8] leading-relaxed">
              Console accounts already exist. New registrations start as
              <span className="font-bold"> pending</span> — after verifying their email by the link we send,
              they must be approved by the Super-Admin here before they can sign in.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">{error}</p>
            </div>
          )}
          {info && !error && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-300 leading-relaxed">{info}</p>
            </div>
          )}

          {mode === 'signin' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={siEmail}
                  onChange={(e) => setSiEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  placeholder="admin@example.com"
                  className={`${inputBase} border-slate-700 focus:border-[#C5A880]`}
                />
              </div>
              <PasswordField label="Password" value={siPassword} onChange={setSiPassword} autoComplete="current-password" />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] text-slate-400 underline underline-offset-2 hover:text-[#C5A880] transition-colors"
                >
                  Forgot password?
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#C5A880] px-4 py-2 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors shadow-md disabled:opacity-60"
                >
                  {busy ? 'Signing in…' : 'Sign In'}
                </button>
              </div>
            </>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={rgName}
                  onChange={(e) => setRgName(e.target.value)}
                  autoComplete="name"
                  placeholder="Jane Doe"
                  className={`${inputBase} border-slate-700 focus:border-[#C5A880]`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={rgEmail}
                  onChange={(e) => setRgEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="admin@example.com"
                  className={`${inputBase} border-slate-700 focus:border-[#C5A880]`}
                />
              </div>
              {firstRunBootstrap && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Bootstrap token <span className="text-[#C5A880]">(one-time — creates the Super-Admin)</span>
                  </label>
                  <input
                    type="text"
                    value={rgBootstrapToken}
                    onChange={(e) => setRgBootstrapToken(e.target.value)}
                    autoComplete="off"
                    placeholder="Paste the one-time ADMIN_BOOTSTRAP_TOKEN"
                    className={`${inputBase} border-[#C5A880]/50 focus:border-[#C5A880] font-mono tracking-wide`}
                  />
                </div>
              )}
              <div>
                <PasswordField label="Password (choose your login password)" value={rgPassword} onChange={setRgPassword} autoComplete="new-password" />
                <PolicyChecklist password={rgPassword} />
              </div>
              <PasswordField label="Confirm password" value={rgConfirm} onChange={setRgConfirm} autoComplete="new-password" />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[#C5A880] px-4 py-2.5 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors shadow-md disabled:opacity-60"
              >
                {busy ? 'Creating account…' : firstRunBootstrap ? 'Create Super-Admin Account' : 'Request Account'}
              </button>
              {!firstRunBootstrap && bootstrapAvailable !== null && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  New accounts are created with <span className="text-slate-300">pending</span> status, must verify
                  their email address by the link we send, and then be approved by the Super-Admin before the first
                  sign-in.
                </p>
              )}
            </>
          )}

          {mode === 'forgot' && (
            <>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Enter the email of your console account. If it is registered, we send a single-use reset link that
                is valid for 15 minutes; resetting signs out all devices.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Account email</label>
                <input
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  placeholder="admin@example.com"
                  className={`${inputBase} border-slate-700 focus:border-[#C5A880]`}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[#C5A880] px-4 py-2.5 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors shadow-md disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send Reset Link'}
              </button>
            </>
          )}
        </form>

        {/* Backend scope note */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40">
          <p className="text-[10px] text-slate-500 leading-relaxed flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            Secured by the Kafeely API: passwords are hashed server-side (argon2id) and sessions are hardened
            HttpOnly cookies (docs/backend-migration.md).
          </p>
        </div>
      </div>
    </div>
  );
};

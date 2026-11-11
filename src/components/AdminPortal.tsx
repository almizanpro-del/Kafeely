import React, { useEffect, useMemo, useState } from 'react';
import { AdminSession, AdminUser, AuditLog, WaitlistEntry } from '../types';
import { content } from '../content/translations';
import { exportEntriesAsCsv } from '../utils/storage';
import { deleteWaitlistRecord, fetchWaitlist, logWaitlistExport } from '../utils/waitlist';
import { ApiError, errorMessage } from '../utils/apiClient';
import {
  fetchServerAudit,
  fetchSession,
  fetchTeam,
  isSessionExpired,
  signOut,
  teamMemberAction,
  TeamAction,
} from '../utils/auth';
import { AuthGate } from './AuthGate';
import { AuditTab } from './admin/AuditTab';
import { KpiStrip, RecordsFilterBar, RecordsTable, computeStats, rolesOf } from './admin/RecordsTab';
import { TeamTab, TeamActionModal, PendingTeamAction } from './admin/TeamTab';
import { ChangePasswordModal, DeleteRecordModal, TempSecretModal, TempSecret } from './admin/modals';
import { AlertTriangle, Download, History, KeyRound, Loader2, Lock, LogOut, Users, X } from 'lucide-react';

interface AdminPortalProps {
  onClose: () => void;
}

type ConsoleTab = 'records' | 'audit' | 'team';

/** Maximum merged audit entries kept in the trail view. */
const AUDIT_VIEW_LIMIT = 300;

/**
 * Super-Admin console shell — API-backed (docs/backend-migration.md Phase 4).
 *
 * The session lives in the server-issued HttpOnly cookie; this shell asks
 * /api/auth/me on mount to decide whether the gate stays closed. Records,
 * audit and team data all come from /api/admin/*; nothing is persisted in
 * the browser.
 */
export const AdminPortal: React.FC<AdminPortalProps> = ({ onClose }) => {
  /* ---------------- Session (server cookie — replaces the demo session) ---------------- */
  const [session, setSession] = useState<AdminSession | null>(null);
  const [booting, setBooting] = useState(true);

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('records');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deleteCandidate, setDeleteCandidate] = useState<WaitlistEntry | null>(null);

  /* ---------------- Team & access management ---------------- */
  const [teamUsers, setTeamUsers] = useState<AdminUser[]>([]);
  const [teamAction, setTeamAction] = useState<PendingTeamAction | null>(null);
  const [teamActionError, setTeamActionError] = useState<string>('');
  const [notice, setNotice] = useState<TempSecret | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);

  const isSuperAdmin = session?.role === 'super_admin';

  // Super-admin console is always rendered in English, independent of the
  // public site language.
  const t = content.en.admin;

  /* ---------------- Session bootstrap + expiry watch ---------------- */
  useEffect(() => {
    let cancelled = false;
    fetchSession().then((existing) => {
      if (!cancelled) {
        setSession(existing);
        setBooting(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Local check of the server-issued expiry — when it passes, close the gate.
  // (Real revocation is server-side; every API call that answers 401/403 also
  // drops the session via handleAuthError below.)
  useEffect(() => {
    if (!session) return undefined;
    const intervalId = window.setInterval(() => {
      setSession((current) => (current && isSessionExpired(current) ? null : current));
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [session]);

  const handleAuthError = (error: unknown): boolean => {
    // 401 = the session is gone (expired/revoked) → close the gate.
    // 403 = signed in but not allowed → keep the session, show the error.
    if (error instanceof ApiError && error.status === 401) {
      setSession(null);
      return true;
    }
    return false;
  };

  /* ---------------- Data refresh ---------------- */
  const refreshEntries = async () => {
    setEntriesLoading(true);
    setEntriesError('');
    try {
      setEntries(await fetchWaitlist());
    } catch (error) {
      if (!handleAuthError(error)) {
        setEntriesError(errorMessage(error, 'Could not load waitlist records.'));
      }
    } finally {
      setEntriesLoading(false);
    }
  };

  const refreshAudit = async () => {
    try {
      setAuditLogs(await fetchServerAudit(AUDIT_VIEW_LIMIT));
    } catch (error) {
      handleAuthError(error); // 401 → close the gate; otherwise keep the last view
    }
  };

  const refreshTeam = async () => {
    try {
      const team = await fetchTeam();
      setTeamUsers(team);
    } catch (error) {
      if (!handleAuthError(error)) console.error('Failed to refresh team:', error);
    }
  };

  // Load console data whenever a session becomes available (sign-in, or a
  // returning visitor whose cookie /api/auth/me just confirmed).
  // oxlint-disable set-state-in-effect — fetching external data is exactly what this effect is for
  useEffect(() => {
    if (!session) return;
    void refreshEntries();
    void refreshAudit();
    void refreshTeam();
    // refresh* are recreated per render by design; the session identity is
    // the only trigger we want.
    // oxlint-disable-next-line exhaustive-deps
  }, [session]);
  // oxlint-enable set-state-in-effect

  const handleAuthed = (next: AdminSession) => {
    setSession(next);
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
  };

  /* ---------------- Derived record data ---------------- */
  const stats = useMemo(() => computeStats(entries), [entries]);

  // Extract unique areas
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.area) set.add(e.area);
    });
    return Array.from(set);
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Role filter (FR-02: match any role tag)
      if (roleFilter !== 'all' && !rolesOf(e).includes(roleFilter as WaitlistEntry['role'])) return false;
      // Area filter
      if (areaFilter !== 'all' && e.area !== areaFilter) return false;
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          e.email.toLowerCase().includes(q) ||
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.organisation && e.organisation.toLowerCase().includes(q)) ||
          (e.firm && e.firm.toLowerCase().includes(q)) ||
          (e.area && e.area.toLowerCase().includes(q)) ||
          (e.subRole && e.subRole.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [entries, roleFilter, areaFilter, searchTerm]);

  /* ---------------- Record actions (server-backed) ---------------- */

  // Delete Record Handler (PRD Sec. 4 & UAE PDPL erasure). Super-Admin only;
  // the API enforces it and writes the PII-free audit entry.
  const confirmDeletion = async () => {
    if (!deleteCandidate) return;
    setEntriesError('');
    try {
      await deleteWaitlistRecord(deleteCandidate.id);
      setDeleteCandidate(null);
      await refreshEntries();
      await refreshAudit();
    } catch (error) {
      if (!handleAuthError(error)) {
        setEntriesError(errorMessage(error, 'The record could not be erased.'));
      }
      setDeleteCandidate(null);
    }
  };

  const handleExport = () => {
    // FR-21: the server logs who exported and when (no personal data in the log).
    exportEntriesAsCsv(filteredEntries);
    logWaitlistExport(filteredEntries.length)
      .then(refreshAudit)
      .catch((error) => {
        if (!handleAuthError(error)) console.error('Failed to log CSV export:', error);
      });
  };

  /* ---------------- Team actions (server-enforced) ---------------- */

  const requestTeamAction = (action: PendingTeamAction) => {
    setTeamActionError('');
    setTeamAction(action);
  };

  const runTeamAction = async () => {
    if (!teamAction || !session) return;
    setTeamActionError('');
    const { type, user } = teamAction;
    try {
      const message = await teamMemberAction(user.id, type as TeamAction);
      await refreshTeam();
      refreshAudit();
      setTeamAction(null);
      // The reset action no longer reveals a password on screen — the member
      // receives a single-use email link instead. Surface the server message.
      if (type === 'reset') {
        setNotice({
          title: 'Reset link sent',
          code: user.email,
          warning: message,
        });
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        setTeamActionError(errorMessage(error, 'The action failed. Please try again.'));
      }
    }
  };

  /* ---------------- Auth gate (Sign In / Register / Forgot) ---------------- */
  if (booting) {
    return (
      <div dir="ltr" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md font-sans">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin text-[#C5A880]" aria-hidden="true" />
          <p className="text-xs text-slate-400">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthGate onAuthed={handleAuthed} onClose={onClose} />;
  }

  const pendingCount = teamUsers.filter((u) => u.status === 'pending').length;

  return (
    <div dir="ltr" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-sans animate-in fade-in duration-200">
      <div className="relative flex flex-col h-[90vh] w-full max-w-6xl rounded-2xl border border-slate-700 bg-[#0B132B] shadow-2xl overflow-hidden text-start">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#0E1B38] px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#C5A880]/20 text-[#C5A880]">
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-white truncate">
                  {t.title}
                </h3>
                <span className="hidden md:inline text-[11px] font-mono text-amber-400 shrink-0">
                  {t.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Signed-in identity */}
            <div className="hidden lg:flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5">
              <div className="leading-tight text-end">
                <div className="text-[11px] font-semibold text-slate-200 max-w-[160px] truncate">{session.name}</div>
                <div className="text-[10px] font-mono uppercase tracking-wide text-amber-400">
                  {session.role === 'super_admin' ? 'Super-Admin' : 'Staff'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowChangePw(true)}
              className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Change my password"
              aria-label="Change my password"
            >
              <KeyRound className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="hidden sm:flex items-center gap-1.5 rounded-md border border-[#C5A880]/60 bg-[#C5A880]/15 px-3 py-1.5 text-xs font-semibold text-[#E8D7B8] hover:bg-[#C5A880] hover:text-[#0B132B] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.exportCsv}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close Admin Portal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <KpiStrip stats={stats} t={t} />

        {/* Tab & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-b border-slate-800 bg-[#0E1B38]/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'records'
                  ? 'bg-[#C5A880] text-[#0B132B]'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Waitlist Records ({filteredEntries.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('audit');
                refreshAudit();
              }}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'audit'
                  ? 'bg-[#C5A880] text-[#0B132B]'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Compliance Audit Trail</span> ({auditLogs.length})
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  refreshTeam();
                  setActiveTab('team');
                }}
                className={`relative flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'team'
                    ? 'bg-[#C5A880] text-[#0B132B]'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Team &amp; Access</span> ({teamUsers.length})
                {pendingCount > 0 && activeTab !== 'team' && (
                  <span className="absolute -top-1.5 -end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-[#0B132B]">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {activeTab === 'records' && (
            <RecordsFilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              areaFilter={areaFilter}
              onAreaFilterChange={setAreaFilter}
              uniqueAreas={uniqueAreas}
              t={t}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'records' &&
            (entriesLoading && entries.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-[#C5A880]" aria-hidden="true" />
                Loading waitlist records…
              </div>
            ) : (
              <>
                {entriesError && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{entriesError}</p>
                  </div>
                )}
                <RecordsTable
                  entries={filteredEntries}
                  onErase={setDeleteCandidate}
                  canErase={isSuperAdmin}
                  t={t}
                />
              </>
            ))}

          {activeTab === 'audit' && <AuditTab logs={auditLogs} t={t} />}

          {activeTab === 'team' && isSuperAdmin && (
            <TeamTab users={teamUsers} sessionEmail={session.email} onAction={requestTeamAction} onRefresh={refreshTeam} />
          )}
        </div>

        {/* Confirmation Modal — Data Erasure */}
        {deleteCandidate && (
          <DeleteRecordModal
            candidateEmail={deleteCandidate.email}
            candidateRole={deleteCandidate.role}
            onCancel={() => setDeleteCandidate(null)}
            onConfirm={confirmDeletion}
            t={t}
          />
        )}

        {/* Confirmation Modal — Team Actions */}
        {teamAction && (
          <TeamActionModal
            action={teamAction}
            error={teamActionError}
            onCancel={() => setTeamAction(null)}
            onConfirm={runTeamAction}
            cancelLabel={t.cancel}
          />
        )}

        {/* Server-notice dialog (e.g. reset link emailed) */}
        {notice && <TempSecretModal secret={notice} onClose={() => setNotice(null)} />}

        {/* Change My Password modal */}
        {showChangePw && (
          <ChangePasswordModal
            onClose={() => setShowChangePw(false)}
            onAuditRefresh={refreshAudit}
          />
        )}
      </div>
    </div>
  );
};

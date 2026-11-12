/**
 * Super-Admin console authentication — API-backed (docs/backend-migration.md
 * Phase 4 cutover).
 *
 * Everything authoritative now lives on the server: accounts and argon2id
 * password hashes in Neon Postgres, sessions in the __Host-session HttpOnly
 * cookie (14-day sliding expiry) managed by /api/auth/*. This module is a
 * thin, typed client in front of those endpoints — it holds no secrets and
 * performs no security decisions of its own (the API is the gate).
 *
 * Flow parity with the demo phase, with two honest upgrades:
 *  - Password reset is email-based (single-use link, 15-minute validity)
 *    instead of one-time recovery codes shown on screen.
 *  - The first Super-Admin is created with the one-time ADMIN_BOOTSTRAP_TOKEN
 *    instead of the risky "first registrant wins" rule.
 *
 * Nothing about accounts, lockouts or audit entries is kept in the browser;
 * the server is the single source of truth.
 */

import { AdminRole, AdminSession, AdminStatus, AdminUser, AuditLog } from '../types';
import { apiFetch, ApiError } from './apiClient';
import { isValidEmail } from './validation';

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

/** Public user row as returned by the API (never contains hash material). */
interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface MeResponse {
  user: ApiUser;
  expiresAt: string;
}

interface RegisterResponse {
  user: ApiUser;
  bootstrap: boolean;
  verifyEmailSent: boolean;
  message: string;
}

interface TeamResponse {
  team: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    lastLoginAt: string | null;
  }>;
  actor: { id: string; email: string; role: string };
}

interface AuditResponse {
  logs: Array<{
    id: string;
    action: string;
    performedBy: string;
    targetEmail: string | null;
    role: string | null;
    details: string;
    createdAt: string;
  }>;
}

function toAdminRole(role: string): AdminRole {
  return role === 'super_admin' ? 'super_admin' : 'staff';
}

function toAdminStatus(status: string): AdminStatus {
  return status === 'pending' || status === 'suspended' ? status : 'active';
}

/** Maps the /me and /login payloads onto the console's session shape. */
function toSession(user: ApiUser, expiresAtIso: string): AdminSession {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: toAdminRole(user.role),
    issuedAt: Date.now(),
    expiresAt: new Date(expiresAtIso).getTime(),
  };
}

export function isSessionExpired(session: AdminSession): boolean {
  return Date.now() > session.expiresAt;
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

/**
 * Asks the server who is signed in (cookie-based). Returns null when there
 * is no valid session (401) or the API cannot be reached — the gate stays
 * closed either way; a transient outage surfaces on the next sign-in attempt.
 */
export async function fetchSession(): Promise<AdminSession | null> {
  try {
    const result = await apiFetch<MeResponse>('/api/auth/me');
    return toSession(result.user, result.expiresAt);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Registration & sign-in                                              */
/* ------------------------------------------------------------------ */

/**
 * True while the console has no accounts at all — the Create Account form
 * then asks for the one-time bootstrap token (first account = Super-Admin).
 * Unknown (network/API error) resolves to false so the token field stays
 * hidden; registration without it still works (pending staff).
 */
export async function fetchBootstrapAvailable(): Promise<boolean> {
  try {
    const result = await apiFetch<{ hasUsers: boolean }>('/api/auth/bootstrap-status');
    return !result.hasUsers;
  } catch {
    return false;
  }
}

export interface RegisterAccountInput {
  name: string;
  email: string;
  password: string;
  /** One-time ADMIN_BOOTSTRAP_TOKEN — required for the first Super-Admin. */
  bootstrapToken?: string;
}

export async function registerAccount(input: RegisterAccountInput): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      ...(input.bootstrapToken ? { bootstrapToken: input.bootstrapToken.trim() } : {}),
    },
  });
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  const result = await apiFetch<MeResponse>('/api/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
  return toSession(result.user, result.expiresAt);
}

/** Revokes the server session and clears the cookie. Idempotent. */
export async function signOut(): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  } catch {
    /* signing out must never fail client-side; the cookie expiry covers it */
  }
}

/* ------------------------------------------------------------------ */
/* Password reset (email link flow) & email verification               */
/* ------------------------------------------------------------------ */

export async function requestPasswordReset(email: string): Promise<string> {
  const result = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  });
  return result.message;
}

export async function resetPasswordWithToken(token: string, password: string): Promise<string> {
  const result = await apiFetch<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
  return result.message;
}

export async function verifyEmailWithToken(token: string): Promise<string> {
  const result = await apiFetch<{ message: string }>('/api/auth/verify-email', {
    method: 'POST',
    body: { token },
  });
  return result.message;
}

/* ------------------------------------------------------------------ */
/* Self-service password (signed in)                                   */
/* ------------------------------------------------------------------ */

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<string> {
  const result = await apiFetch<{ message: string }>('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
  return result.message;
}

/* ------------------------------------------------------------------ */
/* Team management & server audit (Super-Admin endpoints)              */
/* ------------------------------------------------------------------ */

export async function fetchTeam(): Promise<AdminUser[]> {
  const result = await apiFetch<TeamResponse>('/api/admin/team');
  return result.team.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: toAdminRole(member.role),
    status: toAdminStatus(member.status),
    createdAt: member.createdAt,
    lastLoginAt: member.lastLoginAt ?? undefined,
  }));
}

export type TeamAction = 'approve' | 'suspend' | 'promote' | 'reactivate' | 'reset' | 'delete';

export async function teamMemberAction(userId: string, action: TeamAction): Promise<string> {
  const result = await apiFetch<{ message: string }>(`/api/admin/team/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { action },
  });
  return result.message;
}

/**
 * Server-side audit trail. The console merges these entries with the
 * browser-era localStorage entries so the trail keeps its history.
 */
export async function fetchServerAudit(limit = 200): Promise<AuditLog[]> {
  const result = await apiFetch<AuditResponse>(`/api/admin/audit?limit=${limit}`);
  return result.logs.map((entry) => ({
    id: entry.id,
    action: entry.action as AuditLog['action'],
    performedBy: entry.performedBy,
    targetEmail: entry.targetEmail ?? undefined,
    role: (entry.role as AuditLog['role']) ?? undefined,
    timestamp: new Date(entry.createdAt).toISOString(),
    details: entry.details,
  }));
}

/* ------------------------------------------------------------------ */
/* Client-side password hints (the server policy is authoritative)     */
/* ------------------------------------------------------------------ */

export interface PasswordPolicyResult {
  length: boolean;
  /** Crude client heuristic mirroring the server blocklist; advisory only. */
  predictable: boolean;
}

/** Server policy: at least 12 characters (NIST 800-63B) + blocklist. */
export function passwordPolicy(password: string): PasswordPolicyResult {
  return {
    length: password.length >= 12,
    predictable: passwordLooksPredictable(password),
  };
}

/**
 * Rough mirror of the API's common-password blocklist: flags obvious bases
 * so users get feedback before hitting the server error. Advisory only —
 * the server rejects authoritatively.
 */
export function passwordLooksPredictable(password: string): boolean {
  const lowered = password.toLowerCase();
  const bases = [
    'kafeely',
    'dubai',
    'password',
    'passw0rd',
    'qwerty',
    'admin',
    'letmein',
    'welcome',
    'iloveyou',
    'realestate',
    'changeme',
    '123456',
    'abcdef',
    'summer',
    'winter',
  ];
  const base = lowered.replace(/[0-9!@#$%^&*._-]+$/, '');
  return bases.some((candidate) => base.includes(candidate) || lowered.includes(candidate));
}

/** Convenience pre-check used before calling the API. */
export function registrationProblems(input: {
  name: string;
  email: string;
  password: string;
}): string[] {
  const problems: string[] = [];
  if (input.name.trim().length < 2) problems.push('Please enter your full name (at least 2 characters).');
  if (!isValidEmail(input.email.trim())) problems.push('Please enter a valid email address.');
  if (!passwordPolicy(input.password).length) {
    problems.push('Use at least 12 characters for the password.');
  }
  return problems;
}

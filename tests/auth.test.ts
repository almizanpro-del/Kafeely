/**
 * Unit tests for src/utils/auth.ts — the API-backed console client
 * (docs/backend-migration.md Phase 4). The module is a typed wrapper around
 * /api/auth/* and /api/admin/*, so these tests stub global fetch and assert
 * the request shapes, the response mapping and the error surfacing.
 *
 * The security logic itself (lockouts, tokens, argon2id, session rotation)
 * lives server-side and is covered by the PGlite integration suites in
 * tests/api/.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/utils/apiClient';
import {
  changeOwnPassword,
  fetchBootstrapAvailable,
  fetchServerAudit,
  fetchSession,
  fetchTeam,
  isSessionExpired,
  passwordLooksPredictable,
  passwordPolicy,
  registerAccount,
  registrationProblems,
  requestPasswordReset,
  resetPasswordWithToken,
  signIn,
  signOut,
  teamMemberAction,
  verifyEmailWithToken,
} from '../src/utils/auth';

const USER = {
  id: '111e4567-e89b-12d3-a456-426614174000',
  email: 'owner@kafeely.test',
  name: 'Owner One',
  role: 'super_admin',
  status: 'active',
  emailVerifiedAt: '2026-11-11T00:00:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
  lastLoginAt: null,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('password hints (client-side, server policy stays authoritative)', () => {
  it('requires at least 12 characters', () => {
    expect(passwordPolicy('Abcdef123456').length).toBe(true);
    expect(passwordPolicy('Abcdef12345').length).toBe(false);
  });

  it('flags predictable passwords', () => {
    expect(passwordLooksPredictable('Kafeely2026house')).toBe(true);
    expect(passwordLooksPredictable('MyDubaiRetreat9x')).toBe(true);
    expect(passwordLooksPredictable('qwertyuiopasso')).toBe(true);
    expect(passwordLooksPredictable('grape-marmalade-vault')).toBe(false);
  });
});

describe('registrationProblems (pre-flight checks)', () => {
  it('passes a valid registration', () => {
    expect(registrationProblems({ name: 'Owner One', email: 'owner@kafeely.test', password: 'grape-marmalade-vault-42' })).toEqual([]);
  });

  it('catches a short name, a bad email and a short password', () => {
    const problems = registrationProblems({ name: 'A', email: 'nope', password: 'short' });
    expect(problems).toHaveLength(3);
  });
});

describe('fetchSession (GET /api/auth/me)', () => {
  it('maps an active session from the API payload', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { user: USER, expiresAt: '2026-11-25T00:00:00.000Z' }),
    );
    const session = await fetchSession();
    expect(session).not.toBeNull();
    expect(session!.userId).toBe(USER.id);
    expect(session!.role).toBe('super_admin');
    expect(session!.email).toBe(USER.email);
    expect(session!.expiresAt).toBe(new Date('2026-11-25T00:00:00.000Z').getTime());
  });

  it('returns null when signed out (401) or unreachable', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'unauthenticated', message: 'Sign in to continue.' } }));
    expect(await fetchSession()).toBeNull();

    fetchMock.mockRejectedValueOnce(new TypeError('network down'));
    expect(await fetchSession()).toBeNull();
  });
});

describe('isSessionExpired', () => {
  it('detects a past expiry', () => {
    expect(isSessionExpired({ userId: 'x', name: '', email: '', role: 'staff', issuedAt: 0, expiresAt: Date.now() - 1 })).toBe(true);
    expect(isSessionExpired({ userId: 'x', name: '', email: '', role: 'staff', issuedAt: 0, expiresAt: Date.now() + 60_000 })).toBe(false);
  });
});

describe('fetchBootstrapAvailable (GET /api/auth/bootstrap-status)', () => {
  it('is true only when no accounts exist yet', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hasUsers: false }));
    expect(await fetchBootstrapAvailable()).toBe(true);

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hasUsers: true }));
    expect(await fetchBootstrapAvailable()).toBe(false);
  });

  it('hides the token field on API failure (fail closed, registration still works)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: { code: 'backend_not_configured', message: 'not configured' } }));
    expect(await fetchBootstrapAvailable()).toBe(false);
  });
});

describe('registerAccount (POST /api/auth/register)', () => {
  it('posts name, email, password and the bootstrap token when provided', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        user: USER,
        bootstrap: true,
        verifyEmailSent: false,
        message: 'Super-Admin account created and verified.',
      }),
    );
    const result = await registerAccount({
      name: '  Owner One ',
      email: 'owner@kafeely.test',
      password: 'grape-marmalade-vault-42',
      bootstrapToken: ' boot-token-123 ',
    });

    expect(result.bootstrap).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/register');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      name: 'Owner One',
      email: 'owner@kafeely.test',
      password: 'grape-marmalade-vault-42',
      bootstrapToken: 'boot-token-123',
    });
  });

  it('omits the bootstrap token for regular (pending staff) registrations', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(202, { user: { ...USER, role: 'staff', status: 'pending' }, bootstrap: false, verifyEmailSent: true, message: 'Account created.' }),
    );
    await registerAccount({ name: 'S', email: 's@kafeely.test', password: 'grape-marmalade-vault-42' });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect('bootstrapToken' in body).toBe(false);
  });

  it('surfaces the server error message and field errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        error: { code: 'validation_error', message: 'Some fields need attention.', fields: { password: 'Use at least 12 characters.' } },
      }),
    );
    const error = await registerAccount({ name: 'A', email: 'a@b.co', password: 'short' }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.fields?.password).toBe('Use at least 12 characters.');
  });
});

describe('signIn (POST /api/auth/login)', () => {
  it('maps the login response onto a session', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user: USER, expiresAt: '2026-11-25T00:00:00.000Z' }));
    const session = await signIn('owner@kafeely.test', 'grape-marmalade-vault-42');
    expect(session.role).toBe('super_admin');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/login');
  });

  it('surfaces server copy for pending approval and lockouts verbatim', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, { error: { code: 'pending_approval', message: 'Correct password, but the account is still awaiting Super-Admin approval.' } }),
    );
    const error = await signIn('x@kafeely.test', 'pw').catch((e) => e);
    expect(error.message).toContain('awaiting Super-Admin approval');

    fetchMock.mockResolvedValueOnce(
      jsonResponse(423, { error: { code: 'account_locked', message: 'Too many failed attempts. Sign-in is locked for this email for 12 more minute(s).' } }),
    );
    const locked = await signIn('x@kafeely.test', 'pw').catch((e) => e);
    expect(locked.status).toBe(423);
    expect(locked.message).toContain('12 more minute(s)');
  });
});

describe('email flows', () => {
  it('requestPasswordReset posts the email and returns the generic copy', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { message: 'If that address is registered, a reset link has been sent.' }),
    );
    const message = await requestPasswordReset(' Owner@Kafeely.Test ');
    expect(message).toContain('reset link has been sent');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    // The client sends the trimmed address; the API normalizes the case.
    expect(body.email).toBe('Owner@Kafeely.Test');
  });

  it('resetPasswordWithToken posts token + password', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { message: 'Password updated. All sessions were signed out — sign in again.' }));
    const message = await resetPasswordWithToken('raw-token-abc123', 'grape-marmalade-vault-42');
    expect(message).toContain('sign in again');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      token: 'raw-token-abc123',
      password: 'grape-marmalade-vault-42',
    });
  });

  it('verifyEmailWithToken posts the token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { message: 'Email verified. Sign-in still requires Super-Admin approval.' }));
    const message = await verifyEmailWithToken('verify-token-1');
    expect(message).toContain('Email verified');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/verify-email');
  });

  it('changeOwnPassword posts current + new password', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { message: 'Password changed. Other devices were signed out.' }));
    const message = await changeOwnPassword('old-password-1', 'grape-marmalade-vault-42');
    expect(message).toContain('Password changed');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      currentPassword: 'old-password-1',
      newPassword: 'grape-marmalade-vault-42',
    });
  });
});

describe('team management (GET/PATCH /api/admin/team)', () => {
  it('fetchTeam maps the API rows onto AdminUser', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        team: [
          { id: 'a1', name: 'Owner One', email: 'owner@kafeely.test', role: 'super_admin', status: 'active', createdAt: '2026-11-01T00:00:00.000Z', lastLoginAt: '2026-11-10T00:00:00.000Z' },
          { id: 'a2', name: 'Staff One', email: 'staff@kafeely.test', role: 'staff', status: 'pending', createdAt: '2026-11-02T00:00:00.000Z', lastLoginAt: null },
        ],
        actor: { id: 'a1', email: 'owner@kafeely.test', role: 'super_admin' },
      }),
    );
    const team = await fetchTeam();
    expect(team).toHaveLength(2);
    expect(team[0].role).toBe('super_admin');
    expect(team[1].status).toBe('pending');
    expect(team[1].lastLoginAt).toBeUndefined();
  });

  it('teamMemberAction PATCHes the encoded user id with the action', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { message: 'Reset link emailed.' }));
    const message = await teamMemberAction('111e4567-e89b-12d3-a456-426614174000', 'reset');
    expect(message).toBe('Reset link emailed.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/team/111e4567-e89b-12d3-a456-426614174000');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({ action: 'reset' });
  });

  it('propagates 403 so the console can close the gate', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: { code: 'forbidden', message: 'Super-Admin access is required for this action.' } }));
    const error = await teamMemberAction('a2', 'approve').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
  });
});

describe('fetchServerAudit (GET /api/admin/audit)', () => {
  it('maps createdAt to the client timestamp field and drops nulls', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        logs: [
          { id: 'log1', action: 'ADMIN_LOGIN_SUCCESS', performedBy: 'owner@kafeely.test', targetEmail: 'owner@kafeely.test', role: 'super_admin', details: 'Signed in.', createdAt: '2026-11-10T10:00:00.000Z' },
          { id: 'log2', action: 'ADMIN_ACCOUNT_DELETED', performedBy: 'owner@kafeely.test', targetEmail: null, role: null, details: 'PII-free erasure entry.', createdAt: '2026-11-10T11:00:00.000Z' },
        ],
      }),
    );
    const logs = await fetchServerAudit();
    expect(logs).toHaveLength(2);
    expect(logs[0].timestamp).toBe('2026-11-10T10:00:00.000Z');
    expect(logs[0].targetEmail).toBe('owner@kafeely.test');
    expect(logs[1].targetEmail).toBeUndefined();
    expect(logs[1].role).toBeUndefined();
  });
});

describe('signOut', () => {
  it('never throws — even when the API fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: { code: 'internal_error', message: 'boom' } }));
    await expect(signOut()).resolves.toBeUndefined();

    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(signOut()).resolves.toBeUndefined();
  });
});

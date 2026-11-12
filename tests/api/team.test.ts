/**
 * Team management + audit services (docs/backend-migration.md §6 "Admin
 * console") — the server-side twin of the demo phase's Super-Admin rules:
 * approve / suspend / reactivate / password-reset-by-email / remove, plus the
 * self-protection and last-Super-Admin protections, verified against real
 * Postgres semantics (PGlite).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { listAudit, listTeam, teamAction, type TeamMember } from '../../api/_lib/services/team';
import { teamActionSchema } from '../../api/_lib/validation';
import { createSession, getSessionUser, type SessionUser } from '../../api/_lib/session';
import { requireActiveStaff, requireSuperAdmin } from '../../api/_lib/guards';
import {
  closeAllDbs,
  expectHttpError,
  FakeMailer,
  makeDb,
  seedUser,
  type SeedUser,
} from './helpers';

afterAll(closeAllDbs);

/** expectHttpError is sync — hand it the CAUGHT error, not the promise. */
function httpErrorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((error) => error);
}

/** Minimal SessionUser actor from a seeded row (teamAction only reads identity). */
function actorFrom(seed: SeedUser, role: string, status = 'active'): SessionUser {
  return {
    sessionId: 'test-session',
    id: seed.id,
    email: seed.email,
    name: 'Test Actor',
    role,
    status,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    userCreatedAt: new Date(),
    lastLoginAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };
}

function byEmail(team: TeamMember[], email: string): TeamMember {
  const member = team.find((m) => m.email === email);
  if (!member) throw new Error(`Expected ${email} in team list`);
  return member;
}

describe('teamActionSchema (zod)', () => {
  it('accepts exactly the six supported actions', () => {
    for (const action of ['approve', 'suspend', 'reactivate', 'promote', 'reset', 'delete']) {
      expect(teamActionSchema.safeParse({ action }).success).toBe(true);
    }
    expect(teamActionSchema.safeParse({ action: 'demote' }).success).toBe(false);
    expect(teamActionSchema.safeParse({}).success).toBe(false);
  });
});

describe('guards (server-side role enforcement)', () => {
  it('requireActiveStaff accepts an active member and rejects pending/suspended', async () => {
    const testDb = await makeDb();
    const staff = await seedUser(testDb);
    const staffSession = await createSession(testDb.db, staff.id, {});
    const actor = await requireActiveStaff(testDb.db, staffSession.token);
    expect(actor.id).toBe(staff.id);

    const pending = await seedUser(testDb, { status: 'pending' });
    const pendingSession = await createSession(testDb.db, pending.id, {});
    expectHttpError(await httpErrorOf(requireActiveStaff(testDb.db, pendingSession.token)), 403, 'account_not_active');

    const suspended = await seedUser(testDb, { status: 'suspended' });
    const suspendedSession = await createSession(testDb.db, suspended.id, {});
    expectHttpError(await httpErrorOf(requireActiveStaff(testDb.db, suspendedSession.token)), 403, 'account_suspended');
  });

  it('requireSuperAdmin rejects staff with 403 forbidden', async () => {
    const testDb = await makeDb();
    const staff = await seedUser(testDb, { role: 'staff' });
    const session = await createSession(testDb.db, staff.id, {});
    expectHttpError(await httpErrorOf(requireSuperAdmin(testDb.db, session.token)), 403, 'forbidden');

    const admin = await seedUser(testDb, { role: 'super_admin' });
    const adminSession = await createSession(testDb.db, admin.id, {});
    const actor = await requireSuperAdmin(testDb.db, adminSession.token);
    expect(actor.role).toBe('super_admin');
  });
});

describe('listTeam', () => {
  it('returns pending, active and suspended members but excludes deleted ones', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const pending = await seedUser(testDb, { status: 'pending' });
    const suspended = await seedUser(testDb, { status: 'suspended' });
    const deleted = await seedUser(testDb, { status: 'deleted' });

    const team = await listTeam(testDb.db);
    const emails = team.map((m) => m.email);
    expect(emails).toContain(admin.email);
    expect(emails).toContain(pending.email);
    expect(emails).toContain(suspended.email);
    expect(emails).not.toContain(deleted.email);
    expect(byEmail(team, pending.email).status).toBe('pending');
  });
});

describe('approve', () => {
  it('activates a pending account and writes the audit entry', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const pending = await seedUser(testDb, { status: 'pending' });

    const result = await teamAction(testDb.db, actorFrom(admin, 'super_admin'), pending.id, 'approve', {
      mailer: new FakeMailer(),
    });
    expect(result.message).toContain('approved');

    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, pending.id));
    expect(rows[0]!.status).toBe('active');

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_ACCOUNT_APPROVED' && a.targetEmail === pending.email)).toBe(true);
  });

  it('rejects non-pending targets and the actor acting on themselves', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const active = await seedUser(testDb);

    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin, 'super_admin'), active.id, 'approve', { mailer: new FakeMailer() })),
      400,
      'bad_status',
    );
    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin, 'super_admin'), admin.id, 'approve', { mailer: new FakeMailer() })),
      400,
      'self_action',
    );
    expectHttpError(
      await httpErrorOf(
        teamAction(testDb.db, actorFrom(admin, 'super_admin'), '8f1d9c62-0000-4000-8000-000000000000', 'approve', {
          mailer: new FakeMailer(),
        }),
      ),
      404,
      'account_not_found',
    );
  });
});

describe('suspend / reactivate', () => {
  it('suspends an active member, revokes their sessions and blocks sign-in', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const staff = await seedUser(testDb);
    const staffSession = await createSession(testDb.db, staff.id, {});

    await teamAction(testDb.db, actorFrom(admin, 'super_admin'), staff.id, 'suspend', { mailer: new FakeMailer() });

    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, staff.id));
    expect(rows[0]!.status).toBe('suspended');

    // The member's session must be dead immediately (revoked → 401).
    expectHttpError(await httpErrorOf(getSessionUser(testDb.db, staffSession.token)), 401, 'unauthenticated');

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_ACCOUNT_SUSPENDED')).toBe(true);
  });

  it('allows suspending staff while the Super-Admin stays active, and another Super-Admin suspending each other', async () => {
    const testDb = await makeDb();
    const admin1 = await seedUser(testDb, { role: 'super_admin' });
    const staff = await seedUser(testDb);

    // A Super-Admin cannot act on themselves (self-protection).
    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin1, 'super_admin'), admin1.id, 'suspend', { mailer: new FakeMailer() })),
      400,
      'self_action',
    );

    // Suspending staff is fine even as the only Super-Admin.
    await teamAction(testDb.db, actorFrom(admin1, 'super_admin'), staff.id, 'suspend', { mailer: new FakeMailer() });

    // Two Super-Admins: admin2 suspends admin1 — admin2 remains active.
    const admin2 = await seedUser(testDb, { role: 'super_admin' });
    await teamAction(testDb.db, actorFrom(admin2, 'super_admin'), admin1.id, 'suspend', { mailer: new FakeMailer() });
    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, admin1.id));
    expect(rows[0]!.status).toBe('suspended');
  });

  it('reactivates a suspended account', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const staff = await seedUser(testDb, { status: 'suspended' });

    const result = await teamAction(testDb.db, actorFrom(admin, 'super_admin'), staff.id, 'reactivate', {
      mailer: new FakeMailer(),
    });
    expect(result.message).toContain('reactivated');
    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, staff.id));
    expect(rows[0]!.status).toBe('active');

    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin, 'super_admin'), staff.id, 'reactivate', { mailer: new FakeMailer() })),
      400,
      'bad_status',
    );
  });
});

describe('reset (password reset by email)', () => {
  it('emails a single-use reset link and writes the audit entry', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const staff = await seedUser(testDb);
    const mailer = new FakeMailer();

    const result = await teamAction(testDb.db, actorFrom(admin, 'super_admin'), staff.id, 'reset', {
      mailer,
      linkBase: 'https://kafeely.com',
    });
    expect(result.message).toContain('reset link');

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe(staff.email);
    expect(mailer.sent[0].html).toContain('https://kafeely.com/#reset-password?token=');

    const tokens = await testDb.pgliteDb.select().from(schema.emailTokens);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.purpose).toBe('reset_password');
    expect(tokens[0]!.usedAt).toBeNull();

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    expect(audits.some((a) => a.action === 'ADMIN_PASSWORD_RESET_BY_ADMIN')).toBe(true);
  });

  it('refuses unverified, pending and suspended targets', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const unverified = await seedUser(testDb, { verified: false });
    const pending = await seedUser(testDb, { status: 'pending' });
    const suspended = await seedUser(testDb, { status: 'suspended' });

    const meta = { mailer: new FakeMailer() };
    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin, 'super_admin'), unverified.id, 'reset', meta)),
      400,
      'email_unverified',
    );
    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin, 'super_admin'), pending.id, 'reset', meta)),
      400,
      'bad_status',
    );
    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin, 'super_admin'), suspended.id, 'reset', meta)),
      400,
      'bad_status',
    );
  });
});

describe('delete (remove console account)', () => {
  it('soft-deletes a staff member, revokes sessions and writes the audit entry', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const staff = await seedUser(testDb);
    const staffSession = await createSession(testDb.db, staff.id, {});

    const result = await teamAction(testDb.db, actorFrom(admin, 'super_admin'), staff.id, 'delete', {
      mailer: new FakeMailer(),
    });
    expect(result.message).toContain('removed');

    const rows = await testDb.pgliteDb.select().from(schema.users).where(eq(schema.users.id, staff.id));
    expect(rows[0]!.status).toBe('deleted');
    expect(rows[0]!.deletedAt).not.toBeNull();

    expectHttpError(await httpErrorOf(getSessionUser(testDb.db, staffSession.token)), 401, 'unauthenticated');

    const audits = await testDb.pgliteDb.select().from(schema.auditLogs);
    const entry = audits.find((a) => a.action === 'ADMIN_ACCOUNT_DELETED');
    expect(entry?.targetEmail).toBe(staff.email);

    // Removed members leave the team list.
    const team = await listTeam(testDb.db);
    expect(team.some((m) => m.email === staff.email)).toBe(false);
  });

  it('protects the actor themselves; removing a second Super-Admin keeps at least one active', async () => {
    const testDb = await makeDb();
    const admin1 = await seedUser(testDb, { role: 'super_admin' });
    const admin2 = await seedUser(testDb, { role: 'super_admin' });
    const staff = await seedUser(testDb);

    expectHttpError(
      await httpErrorOf(teamAction(testDb.db, actorFrom(admin1, 'super_admin'), admin1.id, 'delete', { mailer: new FakeMailer() })),
      400,
      'self_action',
    );

    // Staff deletion is allowed even with a single Super-Admin.
    await teamAction(testDb.db, actorFrom(admin1, 'super_admin'), staff.id, 'delete', { mailer: new FakeMailer() });

    // Two Super-Admins: admin1 removes admin2 — admin1 remains active.
    const result = await teamAction(testDb.db, actorFrom(admin1, 'super_admin'), admin2.id, 'delete', {
      mailer: new FakeMailer(),
    });
    expect(result.message).toContain('removed');
    const team = await listTeam(testDb.db);
    expect(team.filter((m) => m.role === 'super_admin' && m.status === 'active')).toHaveLength(1);
  });
});

describe('listAudit', () => {
  it('returns newest first and honours the limit', async () => {
    const testDb = await makeDb();
    const admin = await seedUser(testDb, { role: 'super_admin' });
    const staff = await seedUser(testDb);

    for (let i = 0; i < 5; i += 1) {
      await teamAction(testDb.db, actorFrom(admin, 'super_admin'), staff.id, 'suspend', { mailer: new FakeMailer() }).catch(() => {});
      await teamAction(testDb.db, actorFrom(admin, 'super_admin'), staff.id, 'reactivate', { mailer: new FakeMailer() });
    }

    const all = await listAudit(testDb.db, 200);
    expect(all.length).toBeGreaterThanOrEqual(10);
    expect(new Date(all[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(all[all.length - 1].createdAt).getTime(),
    );

    const limited = await listAudit(testDb.db, 3);
    expect(limited).toHaveLength(3);
  });
});

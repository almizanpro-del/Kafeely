/**
 * Auth core service layer (docs/backend-migration.md §6) — every flow of the
 * "full auth system": register, verify email, login, logout, me, forgot
 * password, reset password, change password, delete account.
 *
 * Services are transport-agnostic: they take a `Db` handle plus request
 * metadata, throw `HttpError` on policy violations, and return plain data.
 * The Vercel handlers under `api/auth/` are thin wrappers. This layer is what
 * the integration tests exercise against PGlite (real Postgres semantics).
 *
 * Security invariants (tested in tests/api/):
 *  - lockout parity: 5 consecutive failures → 15-minute lock (same copy as the client)
 *  - generic error for unknown emails (enumeration resistance)
 *  - email/reset tokens are single-use, hashed at rest, expiry-enforced
 *  - password change/reset revoke sessions (rotation)
 *  - account deletion is soft (30-day grace) with a PII-free audit entry (FR-24)
 */

import { and, eq, sql } from 'drizzle-orm';
import { emailTokens, users } from '../../../db/schema.ts';
import type { Db } from '../db.ts';
import { HttpError, siteUrl } from '../env.ts';
import { safeEqual } from '../crypto.ts';
import { hashPassword, verifyPassword } from '../password.ts';
import { rateLimit } from '../ratelimit.ts';
import { writeAudit } from '../audit.ts';
import { emailHtml, escapeHtml, type Mailer } from '../mailer.ts';
import {
  createEmailToken,
  consumeEmailToken,
  purgeUserTokens,
  RESET_TOKEN_TTL_MS,
  VERIFY_TOKEN_TTL_MS,
} from '../tokens.ts';
import {
  createSession,
  getSessionUser,
  revokeOtherSessions,
  revokeSessionByHash,
  type SessionUser,
} from '../session.ts';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  ResendVerificationInput,
} from '../validation.ts';
import { normalizeEmail } from '../../../src/utils/validation.ts';

// ---------------------------------------------------------------------------
// Constants — parity with the client-side demo rules and the plan document.
// ---------------------------------------------------------------------------

const LOCKOUT_ATTEMPTS = 5;
const REGISTER_IP_LIMIT = 10; // per hour (parity: "at most 10 pending accounts")
const REGISTER_EMAIL_COOLDOWN_S = 30; // 30-second cooldown between registrations
const LOGIN_IP_LIMIT = 30; // per 15 minutes
const FORGOT_LIMIT = 3; // per hour, per IP and per email

const GENERIC_CREDENTIALS_MESSAGE = 'Incorrect email or password.';
const GENERIC_FORGOT_MESSAGE = 'If that address is registered, a reset link has been sent.';
const GENERIC_RESEND_MESSAGE =
  'If that address belongs to an unverified account, a new verification email has been sent.';

/**
 * Pre-computed argon2id hash of a throwaway value. Verifying against it for
 * unknown addresses costs the same as a real check, so response timing cannot
 * be used to discover which emails have accounts.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$M9qzhLj2y6oRV7bfDvYK4w$oUQvXHOVTnWgjNqUxJn31r7cdnD9v5rzWniOWSiVwLM';

export interface AuthMeta {
  ip?: string | null;
  userAgent?: string | null;
  /** Base URL for links inside emails, e.g. https://kafeely.com */
  linkBase?: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

function toPublicUser(u: typeof users.$inferSelect): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    emailVerifiedAt: u.emailVerifiedAt ? new Date(u.emailVerifiedAt).toISOString() : null,
    createdAt: new Date(u.createdAt).toISOString(),
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
  };
}

/** Postgres unique-violation, surfaced by both Neon and PGlite. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505';
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export interface RegisterResult {
  user: PublicUser;
  /** true when the account was bootstrapped as Super-Admin via ADMIN_BOOTSTRAP_TOKEN */
  bootstrap: boolean;
  verifyEmailSent: boolean;
  message: string;
}

export async function register(
  db: Db,
  input: RegisterInput,
  meta: AuthMeta & { mailer: Mailer },
): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);

  if (meta.ip) {
    await rateLimit(db, `ip:register:${meta.ip}`, REGISTER_IP_LIMIT, 60 * 60);
  }
  await rateLimit(db, `email:register:${email}`, 1, REGISTER_EMAIL_COOLDOWN_S);

  const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  const isBootstrap =
    Boolean(bootstrapToken) &&
    Boolean(input.bootstrapToken) &&
    safeEqual(input.bootstrapToken ?? '', bootstrapToken ?? '');

  if (isBootstrap) {
    // The bootstrap token exists for exactly one purpose: creating the very
    // first account. Without this guard a leaked token would let the holder
    // mint a new Super-Admin at any later point, long after setup.
    const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
    if (existingUsers[0]) {
      throw new HttpError(
        403,
        'bootstrap_disabled',
        'Bootstrap is closed: this deployment already has accounts. Ask a Super-Admin to create or promote your account.',
      );
    }
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing[0]) {
    throw new HttpError(
      409,
      'email_taken',
      "This email can't be registered. If you already have an account, sign in or reset your password instead.",
    );
  }

  const passwordHash = await hashPassword(input.password);
  let user: typeof users.$inferSelect;
  try {
    const inserted = await db
      .insert(users)
      .values({
        email,
        name: input.name,
        passwordHash,
        role: isBootstrap ? 'super_admin' : 'staff',
        status: isBootstrap ? 'active' : 'pending',
        // The bootstrap token holder just proved administrative control — no
        // emailed verification round-trip is needed (and none can exist yet).
        emailVerifiedAt: isBootstrap ? sql`now()` : null,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new HttpError(500, 'internal_error', 'Account could not be created.');
    user = row;
  } catch (error) {
    // Two concurrent registrations can both pass the pre-check above; the
    // unique index is the real arbiter.
    if (isUniqueViolation(error)) {
      throw new HttpError(
        409,
        'email_taken',
        "This email can't be registered. If you already have an account, sign in or reset your password instead.",
      );
    }
    throw error;
  }

  let verifyEmailSent = false;
  if (!isBootstrap) {
    try {
      const issued = await createEmailToken(db, user.id, 'verify_email', VERIFY_TOKEN_TTL_MS);
      const linkBase = (meta.linkBase ?? siteUrl()).replace(/\/+$/, '');
      await meta.mailer.send({
        to: email,
        subject: 'Verify your email — Kafeely Console',
        html: emailHtml(
          'Verify your email',
          `<p>Hello ${escapeHtml(input.name)},</p>
           <p>Confirm this address to activate your Kafeely console account. After verification,
           a Super-Admin still needs to approve the account before sign-in.</p>
           <p style="font-size:12px;color:#475569">Or paste this one-time token into the verification form:<br>
           <code>${issued.token}</code> <em>(valid for 24 hours)</em></p>`,
          `${linkBase}/#verify-email?token=${encodeURIComponent(issued.token)}`,
        ),
      });
      verifyEmailSent = true;
    } catch (error) {
      // The account exists; a provider outage must not turn into a 500 that
      // makes the user retry (and hit "email taken"). The response tells the
      // client whether the email went out so it can offer "resend".
      console.error('[auth] verification email failed:', error);
    }
  }

  await writeAudit(db, {
    action: 'ADMIN_REGISTER',
    performedBy: isBootstrap ? 'bootstrap-token' : email,
    targetEmail: email,
    targetId: user.id,
    role: user.role,
    details: isBootstrap
      ? 'Super-Admin bootstrapped with the one-time ADMIN_BOOTSTRAP_TOKEN.'
      : 'Console account registered (pending verification and Super-Admin approval).',
  });

  return {
    user: toPublicUser(user),
    bootstrap: isBootstrap,
    verifyEmailSent,
    message: isBootstrap
      ? 'Super-Admin account created and verified.'
      : verifyEmailSent
        ? 'Account created. Check your inbox to verify your email, then wait for Super-Admin approval.'
        : 'Account created, but the verification email could not be sent. Use "Resend verification" on the sign-in screen.',
  };
}

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------

export async function verifyEmail(db: Db, rawToken: string): Promise<{ message: string }> {
  const { userId } = await consumeEmailToken(db, rawToken, 'verify_email');
  await db
    .update(users)
    .set({ emailVerifiedAt: sql`now()` })
    .where(and(eq(users.id, userId), sql`${users.emailVerifiedAt} is null`));
  await purgeUserTokens(db, userId);
  await writeAudit(db, {
    action: 'ADMIN_EMAIL_VERIFIED',
    performedBy: 'email-link',
    targetId: userId,
    details: 'Email address verified via the single-use emailed token.',
  });
  return { message: 'Email verified. Sign-in still requires Super-Admin approval.' };
}

// ---------------------------------------------------------------------------
// Resend verification (unauthenticated, enumeration-safe)
// ---------------------------------------------------------------------------

export async function resendVerification(
  db: Db,
  input: ResendVerificationInput,
  meta: AuthMeta & { mailer: Mailer },
): Promise<{ message: string }> {
  const email = normalizeEmail(input.email);
  await rateLimit(db, `ip:resend:${meta.ip ?? 'unknown'}`, 5, 60 * 60);
  await rateLimit(db, `email:resend:${email}`, 2, 60 * 60);

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  if (user && user.status !== 'deleted' && user.status !== 'suspended' && !user.emailVerifiedAt) {
    try {
      // Only the newest link should work: drop older verification tokens.
      await db
        .delete(emailTokens)
        .where(
          and(eq(emailTokens.userId, user.id), eq(emailTokens.purpose, 'verify_email')),
        );
      const issued = await createEmailToken(db, user.id, 'verify_email', VERIFY_TOKEN_TTL_MS);
      const linkBase = (meta.linkBase ?? siteUrl()).replace(/\/+$/, '');
      await meta.mailer.send({
        to: email,
        subject: 'Verify your email — Kafeely Console',
        html: emailHtml(
          'Verify your email',
          `<p>Hello ${escapeHtml(user.name)},</p>
           <p>Here is a fresh link to confirm your console address. It replaces any earlier
           verification email and expires in 24 hours.</p>
           <p style="font-size:12px;color:#475569">Or paste this one-time token into the verification form:<br>
           <code>${issued.token}</code></p>`,
          `${linkBase}/#verify-email?token=${encodeURIComponent(issued.token)}`,
        ),
      });
      await writeAudit(db, {
        action: 'ADMIN_EMAIL_VERIFICATION_RESENT',
        performedBy: 'resend-verification form',
        targetEmail: email,
        targetId: user.id,
        details: 'A fresh single-use verification link was emailed; earlier links were invalidated.',
      });
    } catch (error) {
      console.error('[auth] resend verification email failed:', error);
    }
  }

  // Identical response for known/unknown/already-verified addresses.
  return { message: GENERIC_RESEND_MESSAGE };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginResult {
  user: PublicUser;
  /** Raw session token — the handler turns this into the __Host-session cookie. */
  sessionToken: string;
  expiresAt: Date;
}

export async function login(db: Db, input: LoginInput, meta: AuthMeta): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  if (meta.ip) {
    await rateLimit(db, `ip:login:${meta.ip}`, LOGIN_IP_LIMIT, 15 * 60);
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  // Unknown email and deleted account: identical generic answer (no
  // enumeration). The dummy verify keeps the timing indistinguishable from a
  // real (failing) password check.
  if (!user || user.status === 'deleted') {
    await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
    await writeAudit(db, {
      action: 'ADMIN_LOGIN_FAILED',
      performedBy: 'sign-in attempt',
      targetEmail: user ? null : email,
      targetId: user?.id ?? null,
      details: user
        ? 'Sign-in attempt on a deleted account.'
        : 'No console account exists for this email.',
    });
    throw new HttpError(401, 'invalid_credentials', GENERIC_CREDENTIALS_MESSAGE);
  }

  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    // Still run the hash check so a locked account is not measurably faster.
    await verifyPassword(user.passwordHash, input.password);
    await writeAudit(db, {
      action: 'ADMIN_LOGIN_FAILED',
      performedBy: 'sign-in attempt',
      targetEmail: email,
      targetId: user.id,
      details: 'Sign-in attempted while the account was locked.',
    });
    // Deliberately the same response as a wrong password: telling the caller
    // that the account is locked confirms the address exists.
    throw new HttpError(401, 'invalid_credentials', GENERIC_CREDENTIALS_MESSAGE);
  }

  const passwordOk = await verifyPassword(user.passwordHash, input.password);
  if (!passwordOk) {
    // One atomic statement: concurrent failures can no longer overwrite each
    // other's counter (previously read-modify-write let N parallel guesses
    // count as a single attempt).
    const updated = await db
      .update(users)
      .set({
        failedAttempts: sql`case when ${users.failedAttempts} + 1 >= ${LOCKOUT_ATTEMPTS} then 0 else ${users.failedAttempts} + 1 end`,
        lockedUntil: sql`case when ${users.failedAttempts} + 1 >= ${LOCKOUT_ATTEMPTS} then now() + interval '15 minutes' else ${users.lockedUntil} end`,
      })
      .where(
        and(
          eq(users.id, user.id),
          sql`(${users.lockedUntil} is null or ${users.lockedUntil} <= now())`,
        ),
      )
      .returning();

    const lockedUntil = updated[0]?.lockedUntil;
    const locked = Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
    await writeAudit(db, {
      action: locked ? 'ADMIN_LOCKOUT' : 'ADMIN_LOGIN_FAILED',
      performedBy: 'sign-in attempt',
      targetEmail: email,
      targetId: user.id,
      details: locked
        ? `${LOCKOUT_ATTEMPTS} consecutive failed passwords. Sign-in locked for 15 minutes.`
        : 'Incorrect password. Attempt counter incremented.',
    });
    throw new HttpError(401, 'invalid_credentials', GENERIC_CREDENTIALS_MESSAGE);
  }

  if (user.status === 'suspended') {
    await writeAudit(db, {
      action: 'ADMIN_LOGIN_FAILED',
      performedBy: 'sign-in attempt',
      targetEmail: email,
      targetId: user.id,
      details: 'Correct password, but the account is suspended.',
    });
    throw new HttpError(403, 'account_suspended', 'Correct password, but the account is suspended.');
  }

  if (!user.emailVerifiedAt) {
    throw new HttpError(
      403,
      'email_unverified',
      'Please verify your email address first — check your inbox for the verification link.',
    );
  }

  if (user.status === 'pending') {
    await writeAudit(db, {
      action: 'ADMIN_LOGIN_FAILED',
      performedBy: 'sign-in attempt',
      targetEmail: email,
      targetId: user.id,
      details: 'Correct password, but the account is still awaiting Super-Admin approval.',
    });
    throw new HttpError(
      403,
      'pending_approval',
      'Correct password, but the account is still awaiting Super-Admin approval.',
    );
  }

  // Update first (single statement) so the response reflects the fresh state
  // (lastLoginAt, cleared counters), then mint the new session.
  const updatedRows = await db
    .update(users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: sql`now()` })
    .where(
      and(
        eq(users.id, user.id),
        eq(users.status, 'active'),
        sql`${users.emailVerifiedAt} is not null`,
      ),
    )
    .returning();
  const updatedUser = updatedRows[0];
  if (!updatedUser) {
    // Status changed between the checks above and this write (e.g. suspended
    // concurrently) — fail closed.
    throw new HttpError(401, 'invalid_credentials', GENERIC_CREDENTIALS_MESSAGE);
  }

  const session = await createSession(db, user.id, { ip: meta.ip, userAgent: meta.userAgent });
  await writeAudit(db, {
    action: 'ADMIN_LOGIN_SUCCESS',
    performedBy: email,
    targetEmail: email,
    targetId: user.id,
    role: user.role,
    details: `Signed in (${user.role === 'super_admin' ? 'Super-Admin' : 'Staff'}). Session valid for 14 days (sliding, 30-day maximum).`,
  });

  return {
    user: toPublicUser(updatedUser),
    sessionToken: session.token,
    expiresAt: session.expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Logout / me
// ---------------------------------------------------------------------------

export async function logout(db: Db, rawToken: string | null): Promise<{ ok: boolean }> {
  if (rawToken) {
    await revokeSessionByHash(db, rawToken);
    await writeAudit(db, {
      action: 'ADMIN_LOGOUT',
      performedBy: 'session',
      details: 'Signed out from the console (session revoked server-side).',
    });
  }
  return { ok: true };
}

export async function me(
  db: Db,
  rawToken: string | null,
): Promise<{ user: PublicUser; expiresAt: Date }> {
  const session: SessionUser = await getSessionUser(db, rawToken);
  return {
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      status: session.status,
      emailVerifiedAt: session.emailVerifiedAt
        ? new Date(session.emailVerifiedAt).toISOString()
        : null,
      createdAt: new Date(session.userCreatedAt).toISOString(),
      lastLoginAt: session.lastLoginAt ? new Date(session.lastLoginAt).toISOString() : null,
    },
    expiresAt: new Date(session.expiresAt),
  };
}

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------

export async function forgotPassword(
  db: Db,
  input: ForgotPasswordInput,
  meta: AuthMeta & { mailer: Mailer },
): Promise<{ message: string }> {
  const email = normalizeEmail(input.email);
  await rateLimit(db, `ip:forgot:${meta.ip ?? 'unknown'}`, FORGOT_LIMIT, 60 * 60);
  await rateLimit(db, `email:forgot:${email}`, FORGOT_LIMIT, 60 * 60);

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (user && user.status !== 'deleted' && user.status !== 'suspended') {
    try {
      const issued = await createEmailToken(db, user.id, 'reset_password', RESET_TOKEN_TTL_MS);
      const linkBase = (meta.linkBase ?? siteUrl()).replace(/\/+$/, '');
      await meta.mailer.send({
        to: email,
        subject: 'Reset your password — Kafeely Console',
        html: emailHtml(
          'Reset your password',
          `<p>Hello,</p>
           <p>Use the button below to choose a new password. The link is single-use and
           expires in 15 minutes. All signed-in sessions are signed out after a reset.</p>
           <p style="font-size:12px;color:#475569">Or paste this one-time token into the reset form:<br>
           <code>${issued.token}</code></p>`,
          `${linkBase}/#reset-password?token=${encodeURIComponent(issued.token)}`,
        ),
      });
      await writeAudit(db, {
        action: 'ADMIN_PASSWORD_RESET_REQUEST',
        performedBy: 'forgot-password form',
        targetEmail: email,
        targetId: user.id,
        details: 'Password reset requested; single-use link sent (15-minute validity).',
      });
    } catch (error) {
      // Never turn a provider outage into an account-existence oracle: the
      // caller still gets the same generic success response.
      console.error('[auth] password reset email failed:', error);
    }
  } else {
    // Same audit shape for misses — response timing/content stays uniform.
    await writeAudit(db, {
      action: 'ADMIN_PASSWORD_RESET_REQUEST',
      performedBy: 'forgot-password form',
      targetEmail: email,
      details: 'Password reset requested; no active account matched (generic response sent).',
    });
  }
  return { message: GENERIC_FORGOT_MESSAGE };
}

export async function resetPassword(db: Db, input: ResetPasswordInput): Promise<{ message: string }> {
  const { userId } = await consumeEmailToken(db, input.token, 'reset_password');
  const passwordHash = await hashPassword(input.password);
  await db
    .update(users)
    .set({
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      // Proving mailbox ownership verifies the address.
      emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
    })
    .where(eq(users.id, userId));
  await revokeOtherSessions(db, userId, null); // sign out everywhere
  await purgeUserTokens(db, userId);
  await writeAudit(db, {
    action: 'ADMIN_PASSWORD_RESET_SELF',
    performedBy: 'reset link',
    targetId: userId,
    details: 'Password reset with the emailed single-use token. All sessions were revoked.',
  });
  return { message: 'Password updated. All sessions were signed out — sign in again.' };
}

// ---------------------------------------------------------------------------
// Change password / delete account (authenticated)
// ---------------------------------------------------------------------------

export async function changePassword(
  db: Db,
  rawToken: string | null,
  input: ChangePasswordInput,
): Promise<{ message: string }> {
  const session: SessionUser = await getSessionUser(db, rawToken);
  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');

  const currentOk = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!currentOk) {
    throw new HttpError(401, 'wrong_current_password', 'Your current password is incorrect.');
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  await revokeOtherSessions(db, user.id, rawToken); // keep this device signed in
  await writeAudit(db, {
    action: 'ADMIN_PASSWORD_CHANGED',
    performedBy: user.email,
    targetEmail: user.email,
    targetId: user.id,
    role: user.role,
    details: 'Password changed by the account owner. Other sessions were signed out.',
  });
  return { message: 'Password changed. Other devices were signed out.' };
}

export async function deleteAccount(
  db: Db,
  rawToken: string | null,
  input: { password: string },
): Promise<{ message: string }> {
  const session: SessionUser = await getSessionUser(db, rawToken);
  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw new HttpError(401, 'wrong_current_password', 'Your password is incorrect.');
  }

  await db
    .update(users)
    .set({ status: 'deleted', deletedAt: sql`now()` })
    .where(
      and(
        eq(users.id, user.id),
        // Atomic last-Super-Admin guard: the row only flips when another
        // active Super-Admin exists, so two simultaneous self-deletions can
        // never empty the console.
        sql`(${users.role} <> 'super_admin' or exists (
          select 1 from users other
          where other.role = 'super_admin' and other.status = 'active' and other.id <> ${users.id}
        ))`,
      ),
    )
    .returning()
    .then((rows) => {
      if (!rows[0]) {
        throw new HttpError(
          400,
          'last_super_admin',
          'You are the only active Super-Admin. Promote another Super-Admin before deleting this account.',
        );
      }
    });
  await revokeOtherSessions(db, user.id, null); // sign out everywhere, incl. this device

  // FR-24 parity: the erasure audit entry carries no personal data.
  await writeAudit(db, {
    action: 'ADMIN_ACCOUNT_DELETED',
    performedBy: 'account-owner',
    targetEmail: null,
    targetId: user.id,
    role: user.role,
    details:
      'Account deleted by its owner. Personal data is scheduled for hard deletion after the 30-day reversal window.',
  });
  return { message: 'Account deleted. Data will be permanently removed after 30 days.' };
}

/**
 * Database schema — single source of truth for the Neon Postgres tables
 * (docs/backend-migration.md §5).
 *
 * Emails are stored normalized-lowercase (src/utils/validation.ts
 * `normalizeEmail`) with a UNIQUE constraint, which gives case-insensitive
 * lookups without depending on the `citext` extension — keeps the schema
 * portable across Neon and local test databases (PGlite).
 *
 * All timestamps are `timestamptz`. Erasure audit entries carry no PII (FR-24
 * parity): `target_email` is null there.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/** Console accounts. Roles/statuses mirror the client-side lifecycle (pending → active). */
export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    /** argon2id PHC string — never a plaintext or reversible secret. */
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('staff'), // super_admin | staff
    status: text('status').notNull().default('pending'), // pending | active | suspended | deleted
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    /** Brute-force parity: 5 consecutive failures → 15-minute lockout. */
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    /** "Delete my account": soft delete now, hard delete after the 30-day grace window. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('users_status_idx').on(t.status),
    check('users_role_check', sql`${t.role} in ('super_admin', 'staff')`),
    check('users_status_check', sql`${t.status} in ('pending', 'active', 'suspended', 'deleted')`),
  ],
);

/** Server-side sessions — the source of truth for "who is signed in". */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** HMAC-SHA256 of the opaque cookie token (SESSION_SECRET) — raw tokens never touch the DB. */
    tokenHash: text('token_hash').notNull().unique(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Previous session id when a rotation happened (login/password events). */
    rotatedFrom: uuid('rotated_from'),
  },
  (t) => [
    index('sessions_expires_idx').on(t.expiresAt),
    index('sessions_user_idx').on(t.userId),
  ],
);

/** Single-use emailed tokens: address verification + password reset. */
export const emailTokens = pgTable(
  'email_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(), // verify_email | reset_password
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('email_tokens_expires_idx').on(t.expiresAt)],
);

/**
 * Waitlist: one record per person, roles as tags (FR-02). Consumed by the
 * Phase-3 endpoints; created here so the first migration ships the full
 * production shape. `verification_token_hash` backs the double opt-in (FR-01).
 */
export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text('email').notNull().unique(),
    role: text('role').notNull(), // owner | tenant | partner | investor
    subRole: text('sub_role').notNull(),
    roleTags: text('role_tags').array().notNull().default(sql`'{}'::text[]`),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    marketingConsent: boolean('marketing_consent').notNull().default(false),
    contactConsent: boolean('contact_consent').notNull().default(false),
    privacyConsentVersion: text('privacy_consent_version').notNull(),
    consentRecord: jsonb('consent_record'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    verified: boolean('verified').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationTokenHash: text('verification_token_hash'),
    /** Double opt-in links expire (48 h) — stale tokens cannot verify forever. */
    verificationExpiresAt: timestamp('verification_expires_at', { withTimezone: true }),
    /** Staged duplicate submission, applied on verification (FR-03). */
    pendingUpdate: jsonb('pending_update'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('waitlist_submitted_idx').on(t.submittedAt),
    index('waitlist_verification_token_idx').on(t.verificationTokenHash),
    index('waitlist_verification_expires_idx').on(t.verificationExpiresAt),
    check('waitlist_entries_role_check', sql`${t.role} in ('owner', 'tenant', 'partner', 'investor')`),
  ],
);

/** Append-only audit trail (PRD §4/§6). Never updated or deleted. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    action: text('action').notNull(),
    performedBy: text('performed_by').notNull(),
    /** Null for erasure entries (FR-24) so the log stays PII-free. */
    targetEmail: text('target_email'),
    targetId: uuid('target_id'),
    role: text('role'),
    details: text('details').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_created_idx').on(t.createdAt)],
);

/** Fixed-window rate-limit counters (per IP and per email). */
export const rateLimitHits = pgTable(
  'rate_limit_hits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

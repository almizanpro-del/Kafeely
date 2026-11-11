/**
 * Test scaffolding for the backend (Phase 1–2) integration tests.
 *
 * Each test file gets a REAL Postgres — PGlite, Postgres compiled to WASM,
 * running in-process — with the committed drizzle migrations applied. That
 * means lockouts, single-use tokens, upsert rate limits and cascades are
 * exercised under genuine Postgres semantics, with zero external services.
 *
 * The same service code runs against Neon in production (api/_lib/db.ts);
 * only the driver differs.
 */

import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../../db/schema';
import type { Db } from '../../api/_lib/db';
import type { EmailInput, Mailer } from '../../api/_lib/mailer';
import { hashPassword } from '../../api/_lib/password';
import { randomToken } from '../../api/_lib/crypto';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url));

// Service code reads these at call time (never at import time), so setting
// them here is enough for every test file.
process.env.SESSION_SECRET ??= 'test-session-secret-1f4b9c2e7d8a';

/** PGlite instances are heavy (WASM heap) — open DBs are closed when the next
 * one opens, and closeAllDbs() runs in each file's afterAll. */
const openClients: PGlite[] = [];

export interface TestDb {
  db: Db;
  client: PGlite;
  /** Drizzle instance typed for the PGlite driver (direct row helpers). */
  pgliteDb: ReturnType<typeof drizzlePglite>;
}

export async function makeDb(): Promise<TestDb> {
  const previous = openClients[openClients.length - 1];
  if (previous) await previous.close().catch(() => {});

  const client = new PGlite();
  openClients.push(client);
  const pgliteDb = drizzlePglite(client);
  await migrate(pgliteDb, { migrationsFolder: MIGRATIONS_DIR });
  return { db: pgliteDb as unknown as Db, client, pgliteDb };
}

export async function closeAllDbs(): Promise<void> {
  while (openClients.length) {
    const client = openClients.pop()!;
    await client.close().catch(() => {});
  }
}

export async function truncateAll(testDb: TestDb): Promise<void> {
  await testDb.db.execute(
    sql`truncate users, sessions, email_tokens, waitlist_entries, audit_logs, rate_limit_hits`,
  );
}

/** Capture mailer — records everything so tests can assert on email content. */
export class FakeMailer implements Mailer {
  readonly sent: EmailInput[] = [];

  async send(input: EmailInput): Promise<{ mode: 'resend' | 'console' }> {
    this.sent.push(input);
    return { mode: 'console' as const };
  }

  /** Extracts the <code>TOKEN</code> part of our email templates. */
  tokenFrom(index: number): string {
    const html = this.sent[index]?.html ?? '';
    const match = /<code>([^<]+)<\/code>/.exec(html);
    if (!match) throw new Error('No token found in captured email');
    return match[1];
  }
}

export interface SeedUser {
  id: string;
  email: string;
  password: string;
}

interface SeedOverrides {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  status?: string;
  /** default true — emailVerifiedAt set to now */
  verified?: boolean;
}

/** Directly inserts a user (bypasses register()), for arranging edge cases. */
export async function seedUser(testDb: TestDb, overrides: SeedOverrides = {}): Promise<SeedUser> {
  const email = overrides.email ?? `staff-${randomUUID().slice(0, 8)}@kafeely.test`;
  const password = overrides.password ?? 'correct horse battery 9';
  const rows = await testDb.pgliteDb
    .insert(schema.users)
    .values({
      email,
      name: overrides.name ?? 'Test Staff',
      passwordHash: await hashPassword(password),
      role: overrides.role ?? 'staff',
      status: overrides.status ?? 'active',
      emailVerifiedAt: overrides.verified === false ? null : new Date(),
    })
    .returning();
  const row = rows[0]!;
  return { id: row.id, email: row.email, password };
}

/** Asserts the error is an HttpError with the expected status/code/message. */
export function expectHttpError(
  error: unknown,
  status: number,
  code?: string,
  messagePart?: string,
): void {
  const err = error as { status?: number; code?: string; message?: string };
  if (typeof err?.status !== 'number') {
    throw new Error(`Expected HttpError(${status}) but got: ${JSON.stringify(error)}`);
  }
  if (err.status !== status) {
    throw new Error(`Expected status ${status}, got ${err.status} (${err.message})`);
  }
  if (code && err.code !== code) {
    throw new Error(`Expected code ${code}, got ${err.code}`);
  }
  if (messagePart && !String(err.message).includes(messagePart)) {
    throw new Error(`Expected message to contain "${messagePart}", got "${err.message}"`);
  }
}

/** Unique-ish email generator that passes the shared validator. */
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${randomToken().slice(0, 10).toLowerCase()}@kafeely.test`;
}

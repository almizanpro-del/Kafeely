/**
 * Database handle for Vercel Functions (docs/backend-migration.md §3).
 *
 * Production uses the official Neon HTTP driver: one-shot fetch queries with
 * no socket to manage, ideal for short-lived serverless invocations, pointed
 * at Neon's *pooled* connection string. All writes are designed statement-wise
 * (no multi-statement transactions needed).
 *
 * The client is memoized per lambda instance; DATABASE_URL is read lazily so
 * importing this module never throws (keeps tests and cold starts clean).
 */

import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { HttpError } from './env.ts';

/**
 * Union of the two drivers used across the codebase — production (Neon HTTP)
 * and tests (PGlite). Both share the same Drizzle query-builder API, so
 * service code is written once and runs against either. Keep the generic at
 * its default (no schema map): every query references explicit table objects.
 */
export type Db = NeonHttpDatabase | PgliteDatabase;

let cached: NeonHttpDatabase | undefined;

/** Returns the memoized Neon HTTP client; 503 when DATABASE_URL is absent. */
export function getDb(): Db {
  if (!process.env.DATABASE_URL) {
    throw new HttpError(
      503,
      'backend_not_configured',
      'DATABASE_URL is not set. See docs/backend-migration.md, Phase 0.',
    );
  }
  cached ??= drizzle(process.env.DATABASE_URL);
  return cached;
}

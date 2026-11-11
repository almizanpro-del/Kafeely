import { defineConfig } from 'drizzle-kit';

// drizzle-kit config (docs/backend-migration.md §8, Phase 1).
// - `npm run db:generate` diffs db/schema.ts against db/migrations (no DB needed).
// - `npm run db:migrate` applies pending migrations — requires DATABASE_URL
//   (a Neon pooled connection string, or any Postgres URL).
export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});

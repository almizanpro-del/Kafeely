/**
 * Environment access + the shared HTTP error type for the API layer.
 *
 * Server-side secrets (docs/backend-migration.md §3) live ONLY in Vercel
 * environment variables — they must never reach the client bundle. Missing
 * configuration surfaces as HTTP 503 with a stable code, so the client can
 * show a sensible "backend not configured yet" state instead of crashing.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Reads a required server-side env var; 503 (not 500) when unconfigured. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(
      503,
      'backend_not_configured',
      `Server-side configuration is incomplete (${name} is not set). See docs/backend-migration.md, Phase 0.`,
    );
  }
  return value;
}

/** Reads an optional env var, returning a default when unset. */
export function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

/**
 * Canonical public origin used for links inside emails.
 *
 * Never derive this from the request's Origin/Host headers: those are
 * attacker-controllable and were previously interpolated into email HTML.
 * SITE_URL mirrors src/config/site.ts and can be overridden per environment
 * (preview deployments) without code changes.
 */
export function siteUrl(): string {
  return optionalEnv('SITE_URL', 'https://kafeely.com').replace(/\/+$/, '');
}

/**
 * Session cookie construction.
 *
 * Production uses the `__Host-` prefix: the browser then enforces Secure,
 * Path=/ and no Domain attribute *by construction*, which removes an entire
 * class of subdomain-cookie attacks. `COOKIE_INSECURE=1` exists only for
 * exotic local http testing and switches to a plain name without Secure.
 */

import { optionalEnv } from './env.ts';

export const SESSION_COOKIE_NAME = '__Host-session';
export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days, sliding

function insecureCookies(): boolean {
  return optionalEnv('COOKIE_INSECURE', '') === '1';
}

/** Full Set-Cookie value for a fresh session token. */
export function buildSessionCookie(token: string): string {
  const secure = !insecureCookies();
  const name = secure ? SESSION_COOKIE_NAME : 'kafeely-session';
  const parts = [
    `${name}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Set-Cookie value that removes the session cookie. */
export function buildClearedSessionCookie(): string {
  const secure = !insecureCookies();
  const name = secure ? SESSION_COOKIE_NAME : 'kafeely-session';
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Extracts the raw session token from the request's Cookie header.
 *
 * The plain `kafeely-session` name is ONLY accepted when COOKIE_INSECURE=1.
 * Accepting it unconditionally in production would let a sibling subdomain
 * plant a session cookie that bypasses the __Host- protections.
 */
export function readSessionCookie(req: { headers: { cookie?: string | string[] } }): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const allowed = insecureCookies() ? new Set([SESSION_COOKIE_NAME, 'kafeely-session']) : new Set([SESSION_COOKIE_NAME]);
  const raw = Array.isArray(header) ? header.join(';') : header;
  for (const pair of raw.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    if (allowed.has(name)) {
      return pair.slice(eq + 1).trim() || null;
    }
  }
  return null;
}

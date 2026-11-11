/**
 * Cryptographic primitives for opaque tokens.
 *
 * - Session / email tokens are 256-bit CSPRNG values (base64url).
 * - Only their HMAC-SHA256 (keyed by SESSION_SECRET) is stored, so a leaked
 *   database dump cannot be replayed as a valid cookie or reset link — an
 *   attacker would still need the app secret.
 * - Comparisons against secrets use timing-safe equality.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { requireEnv } from './env.ts';

/** 256 bits of CSPRNG entropy, URL-safe. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Keyed hash stored in the DB for a raw token. Raw tokens are never persisted. */
export function hmacToken(rawToken: string): string {
  const secret = requireEnv('SESSION_SECRET');
  return createHmac('sha256', secret).update(rawToken, 'utf8').digest('hex');
}

/** Constant-time string comparison (length-safe). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

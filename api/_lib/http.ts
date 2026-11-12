/**
 * HTTP glue shared by every handler: JSON envelope, method check, same-origin
 * (CSRF) assertion, body reading and centralized error mapping.
 *
 * CSRF stance (docs/backend-migration.md §4): session cookies are
 * SameSite=Lax, and every state-changing endpoint additionally rejects
 * requests whose Origin header points at another host. Non-browser clients
 * (no Origin header) are allowed through and still need the cookie.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZodError } from 'zod';
import { HttpError } from './env.ts';

const MAX_BODY_BYTES = 10 * 1024;

export type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

/** Wraps a handler with uniform error mapping. Handlers may throw. */
export function toHandler(fn: Handler): Handler {
  return async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      await fn(req, res);
    } catch (error) {
      sendError(res, error);
    }
  };
}

export function sendError(res: VercelResponse, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    res.status(422).json({
      error: {
        code: 'validation_error',
        message: 'Some fields need attention.',
        fields,
      },
    });
    return;
  }
  console.error('[api] unhandled error:', error);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Unexpected error. Please try again.' },
  });
}

export function assertMethod(req: VercelRequest, method: 'GET' | 'POST' | 'PATCH' | 'DELETE'): void {
  if (req.method !== method) {
    throw new HttpError(405, 'method_not_allowed', `Use ${method} for this endpoint.`);
  }
}

/**
 * Rejects browser-initiated cross-site mutations (Origin present and foreign).
 * Same-origin fetches always carry Origin on POST, matching the deploy host.
 */
export function assertSameOrigin(req: VercelRequest): void {
  const origin = req.headers.origin;
  if (!origin) return; // non-browser client (curl/tests) — still needs the cookie
  let originHost: string;
  try {
    originHost = new URL(String(origin)).host.toLowerCase();
  } catch {
    throw new HttpError(403, 'bad_origin', 'Cross-origin requests are not allowed.');
  }
  // x-forwarded-host can contain a comma-separated chain; the first entry is
  // the host the browser actually addressed.
  const forwarded = req.headers['x-forwarded-host'] ?? req.headers.host;
  const hostHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const host = String(hostHeader ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!host || originHost !== host) {
    throw new HttpError(403, 'bad_origin', 'Cross-origin requests are not allowed.');
  }
}

/** Reads and parses a JSON body with a hard size cap. */
export async function readJsonBody(req: VercelRequest): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : (chunk as Buffer);
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
    }
    chunks.push(buf);
  }
  if (total === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'bad_json', 'Request body must be valid JSON.');
  }
}

/** Client IP as seen by Vercel (first hop of x-forwarded-for), if present. */
export function clientIp(req: VercelRequest): string | null {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  return first ? String(first).split(',')[0].trim() || null : null;
}

export function userAgent(req: VercelRequest): string | null {
  const ua = req.headers['user-agent'];
  return ua ? String(ua).slice(0, 300) : null;
}

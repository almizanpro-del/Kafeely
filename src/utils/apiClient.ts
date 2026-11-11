/**
 * Minimal same-origin fetch wrapper for the Kafeely API (/api/*).
 *
 * The session lives in the __Host-session HttpOnly cookie, so requests only
 * need `credentials: 'same-origin'` — no tokens in JS, no CORS. Errors come
 * back as { error: { code, message, fields? } } and are surfaced as ApiError
 * so components can render the server's copy verbatim.
 */

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the network itself failed. */
    public readonly status: number,
    /** Stable machine code, e.g. invalid_credentials, pending_approval. */
    public readonly code: string,
    message: string,
    /** Field-level messages from 422 validation responses. */
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

export async function apiFetch<T>(path: string, init?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(
      0,
      'network_error',
      'Cannot reach the Kafeely servers. Check your connection and try again.',
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as ApiErrorBody;
    throw new ApiError(
      response.status,
      body.error?.code ?? 'unknown_error',
      body.error?.message ?? 'Unexpected error. Please try again.',
      body.error?.fields,
    );
  }

  return payload as T;
}

/** Best human-readable message from an ApiError, falling back to its text. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    const fieldMessage = error.fields ? Object.values(error.fields)[0] : undefined;
    return fieldMessage || error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

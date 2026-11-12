/**
 * Shared client-side validators.
 *
 * Single source of truth for email validation across the whole app — the
 * public waitlist forms (AudienceForms), the Super-Admin console auth
 * (utils/auth.ts) and the AuthGate all use `isValidEmail`, so the rules can
 * never drift apart again (code-review fix: "form validation parity").
 *
 * This is deliberately a pragmatic, readable check rather than a full
 * RFC 5321 parser: it rejects the common malformed inputs (missing TLD,
 * double "@", double/leading/trailing dots, spaces, oversized strings)
 * without rejecting exotic-but-valid addresses a real visitor might type.
 * For launch, the backend (see docs/backend-migration.md) must re-validate
 * with its own authoritative check and send a confirmation email — the
 * double opt-in link is the ultimate proof of a valid, owned mailbox.
 */

/** Maximum length of the local part (before the "@") per RFC 5321. */
const MAX_LOCAL_PART = 64;
/** Maximum total length of an email address per RFC 5321. */
const MAX_TOTAL = 254;

/**
 * local part: dot-separated atoms of unreserved characters (no leading,
 * trailing or consecutive dots) — e.g. "first.last+tag"
 * domain    : one or more labels followed by an alphabetic TLD of 2–63 chars
 *             — e.g. "sub.domain-example.ae"
 */
const EMAIL_RE =
  /^(?:[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

/**
 * Validates an email address (trims surrounding whitespace first).
 * Returns `true` only for a syntactically sound, launch-safe address.
 */
export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value || value.length > MAX_TOTAL) return false;

  const atIndex = value.lastIndexOf('@');
  if (atIndex === -1) return false;

  const local = value.slice(0, atIndex);
  if (!local || local.length > MAX_LOCAL_PART) return false;

  return EMAIL_RE.test(value);
}

/** Lower-cases and trims an email for storage/lookup (as the data layer does). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

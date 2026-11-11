# Security Policy — Kafeely

This document describes what the current build protects, how secrets are
handled, and the boundaries that remain. Read it together with
`docs/backend-migration.md` (the backend design) and `.env.example`.

## Scope: server-backed application

All first-party data — waitlist submissions, verification state, console
accounts, sessions and the audit trail — lives in **Neon Postgres** behind
Vercel Functions (`api/`). The browser keeps only the language choice and the
cookie-consent preference. The Super-Admin console is an accountability layer
on top of real server-side authentication, not a client-side gate.

- Access to admin endpoints is enforced server-side (`requireActiveStaff` /
  `requireSuperAdmin`), never by hiding UI.
- Record erasure and team management are Super-Admin only; the last active
  Super-Admin cannot be suspended or deleted.
- Responses that touch account existence (registration, login, forgot-password,
  waitlist confirmation) are generic, so they cannot be used to enumerate.
- Real traffic is supported; keep `ADMIN_BOOTSTRAP_TOKEN` out of the
  environment once the first Super-Admin exists.

## Cryptographic choices (server)

| Secret | Storage | Derivation |
| --- | --- | --- |
| Console password | `users.password_hash` | **argon2id** (`@node-rs/argon2` defaults) |
| Session cookie | `sessions.token_hash` | 256-bit random token, HMAC-SHA256 at rest (`SESSION_SECRET`) |
| Email / waitlist tokens | `email_tokens.token_hash`, `waitlist_entries.verification_token_hash` | 256-bit random token, HMAC-SHA256 at rest, single-use and expiring |

- Raw session and email tokens never touch the database; only their HMACs do.
- Session cookies are `__Host-` prefixed: `Secure`, `HttpOnly`, `SameSite=Lax`,
  `Path=/`. A plain cookie name is only accepted when `COOKIE_INSECURE=1` is
  explicitly set for local HTTP testing.
- All randomness comes from Node's CSPRNG (`crypto.randomBytes`).

## Password policy

Minimum **12 characters** (NIST 800-63B) plus a short common-password blocklist
(`api/_lib/validation.ts`). No composition rules; length and blocklist are
authoritative server-side. The client checklist is advisory only.

## Sessions

- 14-day sliding expiry with a **30-day absolute cap**; each response rotates
  the expiry only within that cap.
- Password reset, suspension and removal revoke the affected sessions.
- Sign-in lockout: 5 consecutive failures → 15-minute lockout, applied with a
  single atomic SQL statement so parallel attempts cannot bypass it. Lockout
  responses are identical to ordinary bad-credential responses.
- Registration: 10/hour per IP and a 30-second per-email cooldown, enforced in
  the database. Rate limits back login, forgot-password, resend-verification
  and waitlist submission as well.

## Email links

- Verification: `#verify-email?token=…` (24 hours).
- Password reset: `#reset-password?token=…` (15 minutes; signs out all devices).
- Waitlist double opt-in: `#verify-waitlist?token=…` (48 hours).
- Links are built from `SITE_URL`, never from request `Origin`/`Host` headers.
  Email HTML escapes user-supplied values and failures are logged, not leaked.
- The SPA captures the token from the fragment and immediately scrubs it from
  the address bar and history.

## Compliance-relevant behaviours

- Double opt-in: duplicate waitlist submissions are **staged** (`pendingUpdate`)
  and applied only after the address re-confirms (FR-02/FR-03).
- Erasure (FR-24): the row is hard-deleted and the audit entry deliberately
  contains **no personal data** — no email, no record id.
- The audit trail is append-only (a database trigger rejects UPDATE/DELETE) and
  records sign-ins, failures, lockouts, approvals, promotions, password events,
  exports and erasures.
- A daily cron (`/api/cron/purge`, `CRON_SECRET`) hard-deletes records past the
  30-day erasure window and prunes expired sessions/tokens/rate-limit windows.
- CSV export neutralises spreadsheet formula injection and is logged
  server-side (`EXPORT_CSV`) without personal data.
- Content-Security-Policy, HSTS, `X-Frame-Options: DENY`,
  `Permissions-Policy` and `X-Content-Type-Options` are set in `vercel.json`.
  `style-src` still allows `'unsafe-inline'` (needed by the Tailwind runtime
  injection) — revisit if third-party scripts are ever added.

## Reporting a vulnerability

Please open a **private security advisory** via GitHub
(Security → Report a vulnerability) or contact the maintainers directly.
Do not open a public issue for exploitable findings.

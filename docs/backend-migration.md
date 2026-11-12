# Backend Migration Plan — Neon Postgres + Vercel Functions

> Status: **LIVE for console auth and the waitlist** (2026-11-11). Phase 0 done
> (Neon migrated, Resend verified, Vercel env vars set); Phases 1–4 done. The
> admin-console endpoints, waitlist submit/verify endpoints, the SPA waitlist
> cutover, the server-backed audit trail and the scheduled purge are all
> shipped — no first-party data lives in the browser anymore.
> Remaining: any one-off import of pre-cutover data (Phase 5) and the launch
> checklist sign-off.
>
> The build is a static Vite site whose waitlist, console accounts, sessions
> and audit trail live in Neon Postgres behind Vercel Functions. This plan
> replaces the earlier Supabase sketch and documents how the backend was
> introduced before real traffic, real credentials or marketing spend.
>
> **Decisions made (2026-11):** Neon Postgres (not Supabase) · API as Vercel
> Functions in this repo · v1 sign-in is email + password · transactional
> email via Resend · httpOnly cookie sessions · full data migration to the
> database in v1 (the browser keeps only language and cookie preferences).

---

## 1. Plain-English overview (non-technical)

Today everything the site "remembers" — waitlist signups, console accounts,
the audit log — is stored inside each visitor's own browser. That is fine for
a private demo and it is exactly what the current build does, but it means
there is no single source of truth: no real accounts, no real password
security, and data cannot be shared between the owner's browser and a
customer's browser.

This plan moves that data to **Neon**, a professional cloud database (the
same PostgreSQL software used by most of the industry, offered as a managed
service), and adds a small **API** (a set of server-side endpoints running on
Vercel, deployed together with the website) that becomes the only way data is
read or written. Passwords are never stored in readable form, login sessions
use hardened cookies, and every sensitive flow — sign-up, sign-in, forgot
password, delete my account — is handled by code that runs on our server,
where visitors cannot touch it.

Think of it as: the website stays as it is visually; underneath it gains a
locked storeroom (Neon) and a doorman (the API).

## 2. Why Neon instead of Supabase

| Consideration | Neon (chosen) | Supabase |
| --- | --- | --- |
| What it is | Pure managed PostgreSQL | PostgreSQL + bundled auth/storage/realtime |
| Auth | Not included — we build it with Vercel Functions (this plan) | Bundled Supabase Auth |
| Fit with Vercel | Excellent — Neon is the native Postgres on Vercel's marketplace; zero-config integration | Works, but auth JS client + RLS adds client-side surface |
| Security model | All logic server-side in one place (our Functions) | Logic split between client (RLS policies) and server |
| Branching | Database branches per PR — safe schema/CI testing | Not comparable |
| Pricing (verify current) | Free tier; Launch ≈ $19/mo when needed | Free tier; Pro $25/mo |
| Vendor lock-in | Low — plain Postgres + standard SQL | Higher — auth + RLS policies are Supabase-specific |

**Trade-off accepted:** with Neon we own the auth code (registration, login,
reset, deletion). That is more code to write once, but it is standard,
well-documented work, it keeps every security decision in our own review, and
it avoids coupling the product to Supabase's client SDK and policy model.
Social sign-in (Google) is intentionally deferred to phase 2 — the schema and
session design below already accommodate it.

## 3. Architecture

```
Browser (Vite SPA — unchanged visually)
   │  fetch(), same origin, cookie automatically attached
   ▼
Vercel Functions  (api/*.ts, Node 22 runtime — deployed with the site)
   │  Drizzle ORM  (typed queries + versioned SQL migrations)
   │  @neondatabase/serverless  → Neon pooled endpoint
   │  Resend HTTPS API          → transactional email
   ▼
Neon PostgreSQL (pooled connection, autoscaling, point-in-time restore)
```

- **Same origin**: the API lives at `kafeely.com/api/*` (or the current
  domain), so requests carry session cookies automatically and **no CORS**
  surface is needed. Mutating endpoints additionally verify the `Origin`
  header — together with `SameSite=Lax` cookies this is the modern CSRF
  defence for a same-origin JSON API.
- **Secrets never reach the browser**: `DATABASE_URL`, `RESEND_API_KEY`,
  `ADMIN_BOOTSTRAP_TOKEN`, `SESSION_SECRET` live only in Vercel environment
  variables. The client bundle gets no backend credentials at all.
- **The localStorage layer stays behind a feature flag** (`VITE_DATA_PROVIDER`
  = `api` | `local`) as an offline demo mode until cutover is confirmed, then
  it becomes cache-only.

## 4. Technology choices and standards (and why)

| Concern | Choice | Standard / rationale |
| --- | --- | --- |
| Database | Neon Postgres, **pooled** connection string | Serverless-friendly (pooled endpoint avoids connection storms from many short-lived Functions) |
| Driver | `@neondatabase/serverless` over HTTP | Official Neon driver; one-shot HTTP queries suit serverless lifetimes |
| ORM / migrations | **Drizzle ORM + drizzle-kit** | TypeScript-first, tiny cold-start footprint, versioned SQL migrations committed to the repo (Prisma is heavier on serverless) |
| Password hashing | **argon2id** via `@node-rs/argon2` — memory 19 MiB, iterations 2, parallelism 1 | OWASP Password Storage Cheat Sheet recommendation. Fallback if native binaries misbehave in bundling: `node:crypto` scrypt with N=2^17, r=8, p=1 — also OWASP-approved |
| Password policy | Min 12 chars (max 128), checked against a small common-password blocklist, **no composition rules, no forced rotation** | NIST SP 800-63B; length beats complexity theatre |
| Sessions | Server-side session table + opaque 256-bit random ID; cookie `__Host-session` (HttpOnly, Secure, SameSite=Lax, Path=/); 14-day sliding expiry; **rotation on login and password change** | OWASP Session Management Cheat Sheet; `__Host-` prefix forbids subdomain injection by construction |
| CSRF | `SameSite=Lax` + `Origin` / `Sec-Fetch-Site` check on every mutating endpoint | Modern minimal CSRF design for same-origin JSON APIs; no token synchroniser needed |
| Input validation | **zod** schemas shared between client and API | Single validation contract; the shared `isValidEmail` validator stays the inner-most check |
| Email | **Resend** + domain-verified sender `noreply@kafeely.com` | Sending domain already verified in Resend (SPF/DKIM/DMARC done, EU region); ~100 emails/day free tier is ample for the waitlist phase |
| Rate limiting | Phase 1: Postgres-backed counters per IP + per email (mirrors today's 10-pending / 30s cooldown rules). Add Vercel Firewall managed rules; Upstash Redis only if volume demands it | No extra infrastructure on day one |
| Tokens (verify / reset) | 256-bit random, stored as **SHA-256 hash**, single-use, 15-minute expiry for resets / 24 h for email verification | A leaked database dump cannot be used to reset or confirm accounts |
| Error responses | Generic wording ("If that address is registered, a reset link has been sent") + constant-time comparisons | Account-enumeration resistance |
| Audit | Append-only `audit_logs` table; erasure writes PII-free entries | Preserves the existing FR-24 compliance behaviour |

## 5. Database schema

Managed by drizzle-kit (`npm run db:generate` / `npm run db:migrate`); the
first migration is committed at `db/migrations/0000_init_backend_schema.sql`.
Implementation note: emails are stored normalized-lowercase (shared
`normalizeEmail`) with a UNIQUE constraint — case-insensitive lookups without
the `citext` extension, which keeps the schema portable across Neon and local
test databases (PGlite). The SQL below is the design shape.

```sql
-- Accounts (console + future customers)
create table users (
  id                uuid primary key default gen_random_uuid(),
  email             citext unique not null,
  name              text not null,
  password_hash     text not null,              -- argon2id, PHC string format
  role              text not null default 'staff'
                    check (role in ('super_admin','staff')),
  status            text not null default 'pending'
                    check (status in ('pending','active','suspended','deleted')),
  email_verified_at timestamptz,
  created_at        timestamptz not null default now(),
  last_login_at     timestamptz,
  failed_attempts   integer not null default 0, -- 5 fails → locked_until 15 min (existing UX copy)
  locked_until      timestamptz,
  deleted_at        timestamptz                 -- "delete my account": 30-day grace, then hard delete
);

-- Server-side sessions (source of truth for "who is logged in")
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  token_hash   text unique not null,             -- SHA-256 of the cookie value
  ip           inet,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  rotated_from uuid references sessions(id)      -- rotation audit trail
);

-- Single-use email tokens: address verification + password reset
create table email_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  purpose    text not null check (purpose in ('verify_email','reset_password')),
  token_hash text unique not null,              -- SHA-256, never the raw token
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Waitlist: one record per person, roles as tags (FR-02)
create table waitlist_entries (
  id                      uuid primary key default gen_random_uuid(),
  email                   citext unique not null,
  role                    text not null check (role in ('owner','tenant','partner','investor')),
  sub_role                text not null,
  role_tags               text[] not null default '{}',
  payload                 jsonb not null default '{}',   -- area, unitType, rentBand, phone, …
  marketing_consent       boolean not null default false,
  contact_consent         boolean not null default false,
  privacy_consent_version text not null,
  consent_record          jsonb,                          -- PRD 4.1 metadata
  submitted_at            timestamptz not null default now(),
  verified                boolean not null default false, -- double opt-in (FR-01/FR-03)
  verified_at             timestamptz,
  pending_update          jsonb,                          -- staged duplicate submission (FR-03)
  deleted_at              timestamptz                     -- erasure job hard-deletes (FR-24)
);

-- Append-only audit trail (PRD §4/§6)
create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  performed_by text not null,
  target_email text,                              -- null for erasure entries (FR-24)
  target_id    uuid,
  role         text,
  details      text not null,
  created_at   timestamptz not null default now()
);

-- Rate-limit counters (per IP and per email)
create table rate_limit_hits (
  key          text not null,                     -- e.g. "ip:1.2.3.4:register"
  window_start timestamptz not null,
  count        integer not null default 1,
  primary key (key, window_start)
);
```

Indexes: `sessions(expires_at)`, `email_tokens(expires_at)`,
`waitlist_entries(submitted_at desc)`, `audit_logs(created_at desc)`. Expired
sessions/tokens are purged lazily on read plus a weekly Vercel Cron function.

## 6. API specification

All endpoints: JSON bodies, zod-validated; cookies carried automatically
(same origin); `401` unauthenticated / `403` forbidden / `429` rate-limited /
`422` validation errors with field-level messages.

### Authentication ("the full auth system")

| Method & path | Purpose | Notes |
| --- | --- | --- |
| `POST /api/auth/register` | Create a pending account | Requires `ADMIN_BOOTSTRAP_TOKEN` for the **first** account, which becomes `super_admin` — this replaces the risky "first registrant wins" bootstrap. Later registrations stay `pending` until approved (existing lifecycle kept). Rate-limited per IP (10/hour) and per email (30 s cooldown — parity with today's rules) |
| `POST /api/auth/verify-email` | Consume emailed verification token | Single-use; activates sign-in for the account |
| `POST /api/auth/login` | Sign in | Argon2id verify (timing-safe); `failed_attempts`/`locked_until` lockout mirrors the current "5 fails → 15 min" copy; **session rotation**; audit `login.success` / `login.failure` |
| `POST /api/auth/logout` | Sign out | Deletes the server session, clears cookie |
| `GET /api/auth/me` | Current user + role/status | Used by AuthGate on load — replaces the client-side watcher |
| `POST /api/auth/forgot-password` | Request reset | Always the same generic response; 3/hour per IP + per email |
| `POST /api/auth/reset-password` | Set new password with token | Single-use token, 15-min expiry; **revokes all sessions** of that user; audit entry |
| `POST /api/auth/change-password` | Change password while signed in | Requires current password; revokes other sessions; keeps current session |
| `DELETE /api/account` | "Delete my account" | Requires password re-entry; marks `status='deleted'`, `deleted_at=now()`; hard-deletes PII after 30-day grace (reversal window); audit entry with `target_email = null` (FR-24 parity) |

### Waitlist (public + double opt-in)

| Method & path | Purpose |
| --- | --- |
| `POST /api/waitlist` | Validate + normalise (shared validator), insert or stage `pending_update` on duplicates (FR-03), send verification email via Resend |
| `GET /api/waitlist/verify?token=` | Hash token, flip `verified`, apply `pending_update`, redirect to the site |
| `DELETE /api/waitlist/self` | Erasure request for a waitlist email (FR-24): hard delete + PII-free audit |

### Admin console (server-enforced role checks)

| Method & path | Purpose |
| --- | --- |
| `GET /api/admin/waitlist` | List/search entries (active `staff`/`super_admin` only) |
| `PATCH /api/admin/waitlist/:id` | Update status/notes |
| `GET /api/admin/team` · `PATCH /api/admin/team/:id` | Team list; approve/suspend pending accounts |
| `GET /api/admin/audit` | Audit trail (paginated) |
| `GET /api/admin/export` | CSV export — server-side cursor, same `buildCsv` contract |
| `GET /api/health` | Liveness + DB connectivity (used by CI smoke test) |

Authorisation is a single middleware (`requireActiveStaff` /
`requireSuperAdmin`) — the client-side checks in AuthGate become UX-only.

## 7. Email flows (Resend)

| Trigger | Template | From / subject |
| --- | --- | --- |
| Registration (console) | Verify your email + link | `noreply@kafeely.com` / "Verify your email — Kafeely Console" |
| Waitlist submission | Double opt-in — the exact bilingual copy of today's `VerificationModal` simulation, so the demo-to-production swap stays honest | `noreply@kafeely.com` |
| Forgot password | Reset link, 15-minute validity | `noreply@kafeely.com` |
| Account deleted | Confirmation + 30-day reversal note | `noreply@kafeely.com` |

DNS prerequisites (Phase 0): SPF, DKIM and DMARC records for the sending
domain, verified inside Resend before any real email is sent. Links point to
the production domain only; tokens are single-use and expire.

## 8. Implementation roadmap

Effort assumes one developer (or an AI-assisted session) with the repo
already green. Each phase ends with a commit that passes CI.

### Phase 0 — Accounts, keys and DNS (1–2 h) — DONE
- [x] Neon project created; pooled `DATABASE_URL` copied (2026-11-11; schema migration applied)
- [x] Resend account; sending domain `kafeely.com` verified (SPF/DKIM/DMARC already done; test email delivered)
- [x] Vercel env vars set: `DATABASE_URL`, `RESEND_API_KEY`,
      `ADMIN_BOOTSTRAP_TOKEN`, `SESSION_SECRET` (all server-side only —
      names/shapes documented in `.env.example`); `/api/health` →
      `{"status":"ok","db":"connected"}` in production
- [x] `.env.example` updated with the new server-side names

### Phase 1 — Database + ORM foundation (½–1 day) — DONE
- [x] `drizzle.config.ts`; schema file mirroring §5 (`db/schema.ts`); first
      migration committed (`db/migrations/0000_init_backend_schema.sql`)
- [x] `api/_lib/db.ts` module exporting a pooled Neon HTTP client;
      `/api/health` returns DB status (503 + `not_configured` when unset, so
      previews stay green before Phase 0)
- [x] Test databases: the committed migrations run against PGlite (real
      Postgres, in-process) — CI needs no Neon account. A Neon **branch**
      can replace PGlite later for preview-branch parity
- Acceptance: met — migrations apply cleanly in tests; health endpoint
  behaves as specified.

### Phase 2 — Auth core (2–3 days) — DONE
- [x] Argon2id hashing module + password policy (12–128 chars, common-password
      blocklist incl. numbered variants, NIST 800-63B — no composition rules)
- [x] Session layer: create/rotate/read/revoke; `__Host-session` cookie
      (HttpOnly, Secure, SameSite=Lax); 14-day sliding expiry with throttled
      touch writes
- [x] Endpoints: register, verify-email, login, logout, me, forgot-password,
      reset-password, change-password, delete account (+ `/api/health`)
- [x] DB-backed rate limiting (per IP + per email) with today's limits
      (register 10/h + 30 s cooldown, login 30/15 min, forgot 3/h)
- [x] Vitest integration suites against real Postgres semantics (PGlite):
      lockout parity, generic errors, token single-use/expiry/purpose
      isolation, session revocation, PII-free erasure audit — 59 new tests,
      all passing
- Acceptance: met at service level; browser end-to-end follows in Phase 4.

### Phase 3 — App data APIs (1–2 days) — DONE
- [x] **Admin endpoints with server-enforced role checks** (2026-11-11):
      `GET /api/admin/team`, `PATCH /api/admin/team/:id` (approve / suspend /
      reactivate / email reset link / remove — self-protection, last-
      Super-Admin protection, session revocation on suspend/remove),
      `GET /api/admin/audit` and `GET /api/auth/bootstrap-status`
- [x] Audit writes on every team/account state change (ADMIN_* vocabulary
      parity with the client-side trail); PGlite integration tests in
      `tests/api/team.test.ts`
- [x] Waitlist submit/verify (FR-01/FR-03), admin list/erase (FR-24) and
      export logging (FR-21) — `api/waitlist/*`, `api/admin/waitlist/*`
- [x] Scheduled housekeeping at `/api/cron/purge` (Vercel Cron, `CRON_SECRET`):
      30-day erasure window, expired sessions/tokens and rate-limit windows
- Acceptance: console and public forms read/write live data — met.

### Phase 4 — Frontend cutover (1–2 days) — DONE
- [x] **AuthGate switched to the API** (2026-11-11): `GET /api/auth/me` on
      mount (replaces the client-side watcher), register with bootstrap
      token (surfaced from `GET /api/auth/bootstrap-status` when no accounts
      exist), email-based forgot/reset, and the `#verify-email?token=…` /
      `#reset-password?token=…` link handlers (`AuthLinkFlows.tsx`)
- [x] AdminPortal: server session via the `__Host-` cookie; records, Team tab
      and audit trail all read `/api/admin/*`; a 401 closes the gate (403 keeps
      the session and shows the permission error); the demo localStorage auth
      module was replaced by the API client in `src/utils/auth.ts`
- [x] Error/loading states for API failures (session-check spinner, records
      spinner, actionable network copy)
- [x] Waitlist cutover: forms POST `/api/waitlist`, the `#verify-waitlist?token=…`
      link completes the double opt-in, and the console reads/erases/export-logs
      through `src/utils/waitlist.ts`
- Acceptance: registration → verify → login → approve team member, and waitlist
  submission → double opt-in → export — both met end-to-end against the API.

### Phase 5 — Data migration + hardening + launch (1 day)
- [ ] Export existing waitlist from the admin console (CSV) → import script
      `scripts/import-waitlist.ts` (dedupe on email, preserve consent records)
- [ ] Optionally re-send verification to unverified imports (double opt-in)
- [x] Vercel Cron purges expired tokens (`/api/cron/purge`, daily)
- [ ] Vercel Firewall rate rules on
- [ ] Neon point-in-time restore verified; monitoring (Neon + Vercel +
      Resend dashboards) checked
- [ ] Launch checklist (§10) signed off
- Acceptance: production serves real signups; localStorage holds nothing
  authoritative.

**Total: roughly 6–9 focused days.**

## 9. Data protection notes

The deletion flows (console account + waitlist self-erase) implement the
erasure rights expected by GDPR-style regimes and regional equivalents
(UAE PDPL, Jordan PDPL No. 1 of 2023 — the operator's domicile): hard delete
of personal data after a 30-day reversal window, with an audit entry that
contains no personal data. Consent records (marketing/contact + privacy
version) travel with each waitlist row, preserving the PRD 4.1 evidence
chain. This plan is not legal advice — the claims register / counsel
sign-off workflow (PRD Appendix C) still applies.

## 10. Launch checklist

- [ ] Secrets present in Vercel only; none in the client bundle (verify build
      output has no `DATABASE_URL`/`RESEND_API_KEY` strings)
- [ ] `ADMIN_BOOTSTRAP_TOKEN` used once, then removed from env after the
      super-admin exists
- [ ] SPF/DKIM/DMARC verified by an actual test email to Gmail + Outlook
- [ ] Lockout message copy matches the existing UI strings
- [ ] `#super-admin` console: server-side 401/403 confirmed in devtools
      network tab for a non-admin
- [ ] Forgot-password tested for a non-existent address (generic response)
- [ ] Delete-my-account tested: reversal within 30 days possible, hard
      deletion after, audit entry PII-free
- [ ] Rate limits triggered in testing (429s observed)
- [ ] Rollback plan: Vercel instant rollback to the pre-API deployment; the
      flag-gated localStorage mode remains usable for offline demos
- [ ] Rotate any token that was ever pasted in chat or committed by accident

## 11. What explicitly does NOT change

- The compliance UX: double opt-in staging, PII-free erasure logging,
  separate marketing/contact consent, consent wording capture (PRD 4.1).
- The hidden-console entry (`#super-admin`) — now guarded by real server
  sessions instead of client-only checks.
- The claims register / counsel sign-off workflow (PRD Appendix C).
- The public site itself: same components, same copy, same design.

## 12. Deferred (phase 2) ideas

- **Google sign-in** — OAuth/OIDC via a generic `oauth_accounts` linking
  table; the session design above already supports it without schema change.
- **TOTP two-factor** for console staff (optional `totp_secret` column).
- Upstash Redis rate limiting if Postgres counters become hot.
- Realtime console updates (Server-Sent Events) instead of polling.
- Neon read-replica + pagination cursor upgrades if the waitlist grows large.

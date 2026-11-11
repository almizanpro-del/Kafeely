# Kafeely — Dubai Premium Rental Protection Platform

[![CI](https://github.com/almizanpro-del/kafeelyai/actions/workflows/ci.yml/badge.svg)](https://github.com/almizanpro-del/kafeelyai/actions/workflows/ci.yml)

Pre-launch promo website and waitlist for Kafeely (الكفيل), targeting owners, tenants, partners and investors in Dubai's premium residential market. Built with **Vite + React 19 + TypeScript + Tailwind CSS v4** (originally generated in Google AI Studio), with full Arabic RTL / English LTR support.

## Getting started

```bash
npm install
npm run dev      # local dev server on http://localhost:3000
npm run build    # production build → dist/
npm run lint     # oxlint + typecheck (tsc --noEmit)
npm test         # unit tests (vitest) for the pure logic layer
```

See `CONTRIBUTING.md` for the full script list and conventions, `SECURITY.md`
for the cryptographic choices, password/recovery-code policy and the honest
scope of the demo-phase security model, and `docs/backend-migration.md` for
the approved production backend plan (Neon Postgres + Vercel Functions).

## Continuous integration

`.github/workflows/ci.yml` runs on every push to main and every pull request:
`npm ci` → **oxlint** → **typecheck** → **tests** → **production build**.
It is intentionally cheap — it exists to catch regressions, not to gate style
opinions. `.github/dependabot.yml` proposes grouped weekly dependency updates.

## Deploying to Vercel

The repository includes a `vercel.json` (Vite preset, SPA rewrites, asset caching, security headers), so deployment works with zero configuration:

1. Push this repo to GitHub (already done) and go to [vercel.com/new](https://vercel.com/new).
2. Import the `almizanpro-del/kafeelyai` repository.
3. Vercel auto-detects Vite: build command `npm run build`, output directory `dist`.
4. Set the server-side environment variables from `.env.example` (`DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `ADMIN_BOOTSTRAP_TOKEN`, `SITE_URL`, `CRON_SECRET`) before the first deploy that uses the API.

The public landing page is static, but the waitlist, console auth and cron
endpoints require a Neon database and the variables above.

## 404 handling (no catch-all)

The site is a single page, so `vercel.json` intentionally has **no SPA rewrite**: `/` serves the app, real files (assets, og-image, favicon) are served as-is, and every unknown path (e.g. `/wp-admin/...`, `/foo`) returns a real **HTTP 404** with the branded bilingual page in `public/404.html` (copied to `dist/` by Vite). As a client-side safety net, `App.tsx` also renders a "Page not found" view whenever the app itself loads under a non-root path.

## Super-Admin console (dashboard) & authentication

The waitlist dashboard is hidden from the public site — there is no link in the navigation. It opens only via the direct URL:

```
https://<your-domain>/#super-admin
```

The check is deliberately forgiving so the console always opens (`src/App.tsx`):

- The hash is matched **case-insensitively** and tolerates the variants `#/super-admin` and `#super-admin/`.
- If a chat app or link resolver strips the fragment, **`https://<your-domain>/?admin=1`** reaches the same console and the URL is normalized back to `#super-admin`.
- The hash is re-checked on `hashchange` and on back/forward-cache restores (`pageshow`), so typing the hash into the address bar of an already-open tab still works. There is no polling loop.

If the console still does not appear on a device, the browser is running a **cached pre-deployment copy** of the page — do one hard refresh (Ctrl+F5 / Cmd+Shift+R, or hold the mobile refresh button) and retry.

The console uses **real account authentication, backed by the Kafeely API** (`src/utils/auth.ts` → `/api/auth/*`, accounts and sessions live in Neon Postgres — `docs/backend-migration.md`):

- **Registration** — the first account is created with the one-time `ADMIN_BOOTSTRAP_TOKEN` and becomes the verified **Super-Admin** immediately. Later registrations start with `pending` status, verify their email by the link we send, and must then be approved by the Super-Admin in the console's **Team & Access** tab before they can sign in.
- **Sign-in** — email + personal password. Passwords are hashed **server-side with argon2id**; nothing reversible is ever stored or sent to the browser.
- **Brute-force protection** — 5 consecutive failed passwords lock that email for **15 minutes** (enforced by the API, mirrored by its error copy).
- **Session** — hardened `__Host-` HttpOnly cookie (Secure, SameSite=Lax) with a **14-day sliding expiry and a 30-day absolute cap**; the server session is the single source of truth and can be revoked at any time.
- **Registration anti-spam** — enforced server-side: 10 registrations/hour per IP, 30-second cooldown per email (parity with the demo rules).
- **Password reset** — email-based: a single-use reset link (15-minute validity) is sent via Resend from `noreply@kafeely.com`; a reset signs out all devices. There are no recovery codes to lose.
- **Team & Access tab** (Super-Admin only, server-enforced) — approve pending accounts, suspend/reactivate members (suspension revokes their sessions immediately), promote staff to Super-Admin, email a password-reset link, or remove an account. The last active Super-Admin cannot be suspended or deleted. Every action is written to the append-only server-side audit trail.
- **Audit trail** — sign-ins, failures, lockouts, approvals, promotions, password changes and CSV exports/erasures are logged with the acting account (`ADMIN_*` events) and read from the server; no audit data is kept in the browser.

## How waitlist data is stored (important)

All first-party data lives in **Neon Postgres** behind the Kafeely API — console accounts, sessions, the audit trail, and **waitlist entries** (roles, consent records and double opt-in state). Nothing about a data subject is written to `localStorage`; the browser only keeps the language choice and the cookie-consent preference.

- Every submission is stored server-side and confirms via an emailed single-use link (`#verify-waitlist?token=…`, 48-hour validity).
- A repeat submission from the same address stages an update that is applied only when the address re-confirms (FR-03).
- The confirmation response is identical for new and existing addresses, so the form cannot be used to enumerate the list.
- Erasure hard-deletes the row and writes a PII-free audit entry. A daily cron (`/api/cron/purge`) also hard-deletes records past the promised 30-day window and prunes expired sessions/tokens.
- CSV export is built in the browser from the fetched rows; the export event itself is logged server-side (FR-21) and cells beginning with spreadsheet formula sigils are neutralised.

## Backend API (live — auth, waitlist + admin console)

The repo carries a server-side backend (`api/`) built to the approved plan: **Neon Postgres + Vercel Functions + Resend email**, with the complete console auth core — register (one-time `ADMIN_BOOTSTRAP_TOKEN` bootstrap for the very first account only), verify email, resend verification, sign in, sign out, forgot/reset/change password, and delete-my-account — plus hardened `__Host-` cookie sessions, argon2id password hashing, single-use hashed email tokens, DB-backed rate limits and an append-only audit trail.

Console and waitlist endpoints:

- `GET /api/auth/bootstrap-status`, `POST /api/auth/{register,login,logout,forgot-password,reset-password,change-password,verify-email,resend-verification}`, `GET /api/auth/me`
- `POST /api/waitlist`, `POST /api/waitlist/verify`
- `GET /api/admin/waitlist`, `POST /api/admin/waitlist` (export log), `DELETE /api/admin/waitlist/:id` (Super-Admin erasure)
- `GET /api/admin/team`, `PATCH /api/admin/team/:id` (approve / suspend / promote / reactivate / email reset link / remove)
- `GET /api/admin/audit`
- `GET /api/health` (throttled liveness + DB check)
- `GET /api/cron/purge` (daily Vercel Cron; requires `Authorization: Bearer $CRON_SECRET`)

- **Status:** wired end-to-end in the SPA and console. Covered by integration suites that run the committed migrations against real Postgres (PGlite, in-process) — `npm test`.
- **Environment:** `DATABASE_URL` (pooled), `RESEND_API_KEY`, `SESSION_SECRET`, `ADMIN_BOOTSTRAP_TOKEN`, `SITE_URL` and `CRON_SECRET`; see `.env.example`. `/api/health` returns `{"status":"ok","db":"connected"}`.
- **Launch checklist reminder:** remove `ADMIN_BOOTSTRAP_TOKEN` from Vercel once the first Super-Admin account exists.
- **Endpoints:** see §6 of `docs/backend-migration.md`.

## Compliance notes

- **Claims register:** `docs/claims-register.xlsx` — every public figure with source and date; counsel approves before launch (PRD Appendix C).
- **PRD:** `docs/PRD_v3.md` — revised product requirements (v3) reflecting the single-page build and the compliance decisions implemented in code.
- **Privacy notice version:** v1.1-UAE-PDPL (shown in the Privacy Notice modal; recorded per submission).
- **og:image:** `public/og-image.jpg` is referenced with **absolute URLs** built from the `SITE_URL` constant in `src/config/site.ts` (injected into `index.html` at build time — og:image, twitter:image and og:url). Production domain confirmed: `kafeely.com`.
- **Emails:** `noreply@kafeely.com` / `privacy@kafeely.com` are referenced in copy — `kafeely.com` is already verified as a sending domain in Resend (SPF/DKIM/DMARC), and the mailboxes must exist before any real reply-facing email is sent (PRD §7).

## Project structure

```
├── index.html                  # App shell (Arabic RTL default, fonts, absolute OG/Twitter URLs)
├── vercel.json                 # Deployment config (no SPA catch-all, cache, CSP/HSTS headers)
├── .github/workflows/ci.yml    # CI: oxlint → typecheck → vitest → build
├── public/assets/              # Static assets (logo, served as-is)
├── public/og-image.jpg         # Social sharing card (1200x630)
├── docs/                       # PRD v3, claims register, backend-migration.md
├── src/
│   ├── App.tsx                 # Root: language state (persisted), RTL sync, hidden console entry
│   ├── main.tsx                # Entry point
│   ├── config/site.ts          # SITE_URL — single source of truth for absolute URLs
│   ├── components/
│   │   ├── AdminPortal.tsx     # Console shell (session, tabs, orchestration)
│   │   ├── admin/              # Console panels: RecordsTab, AuditTab, TeamTab, modals
│   │   ├── AudienceForms.tsx   # Waitlist forms shell (state, validation, submission)
│   │   ├── forms/              # Form panels: Owner/Tenant/Partner/Investor, fields, SubmittedPanel
│   │   └── …                   # Navbar, HeroSlider, modals, cookie banner, 404
│   ├── content/translations.ts # Arabic / English copy
│   ├── types/index.ts          # Shared types (ConsentRecord, roleTags, pendingUpdate)
│   └── utils/
│       ├── auth.ts             # Typed API client: session, register, reset, team actions
│       ├── waitlist.ts         # Typed API client: submit, verify, admin list/erase/export-log
│       ├── storage.ts          # CSV builder (RFC 4180 + formula-injection guard) + cookie consent
│       └── validation.ts       # Shared email validator (forms + console parity)
├── tests/                      # Vitest unit + PGlite integration suites
└── src/assets/images/          # Hero slider photography (WebP, bundled + hashed)
```

## Testing

The suite runs against a real Postgres (PGlite, in-process) with the committed migrations applied (`npm test`, vitest):

- `tests/api/register.test.ts`, `rate-verify.test.ts` — bootstrap-only Super-Admin rule, email verification/resend, rate limits, single-use tokens.
- `tests/api/login-session.test.ts` — generic login errors (no enumeration), atomic 5-fail/15-min lockout including concurrent attempts, session lifecycle and absolute expiry.
- `tests/api/password.test.ts`, `reset-delete.test.ts` — reset links, password changes, account self-deletion.
- `tests/api/team.test.ts` — approvals, last-Super-Admin protection, promotion, session revocation.
- `tests/api/waitlist.test.ts` — double opt-in, staged duplicate updates (FR-02/FR-03), PII-free erasure (FR-24), export logging, and the scheduled purge (30-day window, expired sessions/tokens).
- `tests/storage.test.ts` — RFC 4180 CSV building, formula-injection neutralisation, cookie consent.
- `tests/auth.test.ts`, `tests/validation.test.ts` — client helpers and the shared email validator.

Web Storage is shimmed (`tests/setup.ts`); time-dependent behaviour uses fake
timers. Add tests for any new logic in `src/utils/*` or `api/_lib/*` — see
`CONTRIBUTING.md`.

# Contributing to Kafeely

Thanks for helping build the Kafeely pre-launch site. This guide covers the
tooling introduced after the 2026-11 code review (tests, lint, CI) and the
project conventions you should keep.

## Getting started

```bash
npm install
npm run dev        # local dev server on http://localhost:3000
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (port 3000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | **oxlint** + **tsc --noEmit** (what CI runs) |
| `npm run lint:oxlint` | Lint only (fast) |
| `npm run typecheck` | TypeScript only |
| `npm run typecheck:watch` | TypeScript in watch mode |
| `npm test` | Unit tests (vitest, single run) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run format` | Prettier write (src, tests, config files) |
| `npm run format:check` | Prettier check |

## Linting: why oxlint (and not typescript-eslint)

The project compiles with **TypeScript 7** (the native port). typescript-eslint
currently supports TypeScript `< 6.1`, so it cannot be used here yet. We
therefore lint with **oxlint** (`.oxlintrc.json`), which parses TS/TSX
natively and includes the React and react-hooks rule sets. Type-level safety
remains fully covered by `tsc --noEmit`.

If/when typescript-eslint ships TS 7 support, swap it in via
`npm run lint` and extend `.oxlintrc.json`'s rules with the type-aware ones
(`no-floating-promises`, `switch-exhaustiveness-check`, …).

**Prettier** (`.prettierrc.json`) handles formatting; `eslint-config`-style
conflicts don't apply. Please don't hand-format — run `npm run format` on the
files you touched. (The existing codebase has not been mass-reformatted; keep
your diffs focused.)

## Testing

Unit tests live in `tests/` and run under **vitest** (Node environment):

- `tests/setup.ts` — Map-backed `localStorage` / `sessionStorage` shims.
- `tests/auth.test.ts` — registration bootstrap, login, lockout, session TTL,
  recovery-code rotation, password changes, team management, anti-spam guards.
- `tests/storage.test.ts` — double opt-in staging (FR-02/FR-03), erasure
  without PII (FR-24), RFC 4180 CSV building, cookie consent.
- `tests/validation.test.ts` — the shared email validator.

Conventions:

- The pure logic lives in `src/utils/*` — keep it DOM-free so it stays
  testable (e.g. CSV assembly is `buildCsv()`, only the download has DOM).
- Time-dependent behaviour (lockouts, session TTL, registration cooldown) is
  tested with `vi.useFakeTimers()` + `vi.setSystemTime()`. Web Crypto runs on
  Node's global `crypto` — no mocks needed.
- Anything that touches compliance (audit logs, consent, erasure) must come
  with tests that assert the *negative* too (e.g. PII absent from logs).

## Project conventions

- **Translations** live in `src/content/translations.ts` only; components
  never hardcode user-facing Arabic/English copy (console chrome is English
  by design).
- **Storage keys** are versioned (`..._v1`); never mutate the shape of an
  existing key — add a `v2` and migrate.
- **Secrets**: never store plaintext passwords or codes; everything goes
  through `deriveHash`. See `SECURITY.md` for the exact policy.
- **Data provider boundary**: waitlist + auth operations are expected to move
  behind a provider interface when the backend lands
  (`docs/backend-migration.md`). Avoid scattering new `localStorage` calls
  outside `src/utils/storage.ts` / `src/utils/auth.ts`.
- **Production origin**: `src/config/site.ts` (`SITE_URL`) is the single
  source of truth for absolute URLs (OG/Twitter cards, canonical).

## Pull request checklist

CI (`.github/workflows/ci.yml`) enforces all of this on every PR:

- [ ] `npm run lint:oxlint` — no new errors (inline `oxlint-disable` only
      with a written justification comment)
- [ ] `npm run typecheck` — clean
- [ ] `npm test` — all green; add tests for new logic
- [ ] `npm run build` — succeeds
- [ ] UI changes verified in both **Arabic (RTL)** and **English (LTR)**
- [ ] No new storage keys without a version suffix + README/SECURITY note

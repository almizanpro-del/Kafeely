# Kafeely — Deployment Guide (Plain Language)

This guide explains how the Kafeely codebase is organised and how to put it
live. No technical background needed — just follow the steps in order.

---

## 1. What lives where

The repository now contains **two apps side by side**:

| Folder | What it is | Where it appears |
|---|---|---|
| `/` (root) | Marketing website (waitlist, info pages) — **unchanged** | `kafeely.com` |
| `/dashboard` | The new multi-role dashboard app (Super Admin, Landlord, Tenant, Broker, Agent, Facility Management, Leasing) | `app.kafeely.com` |

They are **deployed separately** but live in **one repository**, so one
`git push` updates both.

---

## 2. One-time setup

### Step A — Create the database (Neon, free tier is enough to start)

1. Go to https://neon.tech and sign up.
2. Click **New Project**, name it `kafeely`, choose a region close to Dubai
   (e.g. AWS Singapore or Bahrain if available).
3. After creation, Neon shows a **connection string** that looks like:
   `postgresql://user:password@ep-xxxx.neon.tech/kafeely?sslmode=require`
4. Copy it somewhere safe — this is your `DATABASE_URL`.

### Step B — Create the two Vercel projects

The marketing site is most likely already on Vercel. You will add a **second
Vercel project** for the dashboard.

**Project 1 — the marketing site (probably already exists):**
- Root directory: leave as the repository root.
- No changes needed.

**Project 2 — the dashboard:**
1. In Vercel, click **Add New → Project** and import the same GitHub repo
   (`almizanpro-del/Kafeely`).
2. Before clicking Deploy, open **Root Directory** and set it to
   `dashboard`.
3. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from Step A |
   | `SESSION_SECRET` | a long random password (e.g. 40+ random characters) |

4. Click **Deploy**.

### Step C — Create the database tables

Do this once, from your own computer:

```bash
git clone https://github.com/almizanpro-del/Kafeely.git
cd Kafeely/dashboard
bun install            # or: npm install
cp .env.example .env   # then paste your Neon DATABASE_URL + a SESSION_SECRET inside
bunx prisma db push    # creates all tables in Neon
bun prisma/seed.ts     # optional: fills the database with demo data
```

Then redeploy the dashboard project in Vercel (Deployments → Redeploy) so it
picks up the fresh database.

### Step D — Connect the domains

1. In the **site** project: Settings → Domains → `kafeely.com` and
   `www.kafeely.com` (already done if the site is live).
2. In the **dashboard** project: Settings → Domains → add
   `app.kafeely.com` and follow the DNS instructions Vercel shows
   (usually one CNAME record at your domain provider).

---

## 3. Everyday workflow

Nothing changes: edit code (or ask your developer/AI assistant to),
then `git push`. Both Vercel projects redeploy automatically:
the site from the root, the dashboard from `/dashboard`.

---

## 4. Environment variables reference

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | dashboard | Neon Postgres connection string |
| `SESSION_SECRET` | dashboard | Signs login session cookies — treat like a password |

The marketing site keeps whatever variables it already uses (see its own
`.env.example` at the root).

---

## 5. Security checklist

- Never commit `.env` files — they are git-ignored on purpose.
  `.env.example` files show *which* variables are needed, never real values.
- Rotate `SESSION_SECRET` immediately if it ever leaks; it is required in the
  dashboard's Vercel settings for logins to work securely.
- If a GitHub token was ever pasted into a chat, revoke it at
  GitHub → Settings → Developer settings → Personal access tokens.

---

## 6. Local development (for developers)

```bash
# Marketing site (root)
npm install && npm run dev

# Dashboard
cd dashboard
bun install
cp .env.example .env   # fill in a Neon DATABASE_URL + SESSION_SECRET
bunx prisma db push
bun run dev            # http://localhost:3000
```

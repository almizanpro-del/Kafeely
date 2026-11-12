/**
 * Canonical site configuration — SINGLE SOURCE OF TRUTH for the production
 * origin.
 *
 * Code-review fix: og:image / twitter:image were relative ("/og-image.jpg"),
 * which most social scrapers (WhatsApp, LinkedIn, iMessage …) cannot resolve.
 * They are now built from this absolute origin (see vite.config.ts, which
 * replaces the {{SITE_URL}} placeholders in index.html at build time).
 *
 * Confirmed production domain (owner, 2026-11): kafeely.com. Change it HERE
 * ONLY — every absolute URL in the app derives from this constant.
 * The README's compliance notes reference the kafeely.com mailboxes
 * (noreply@kafeely.com / privacy@kafeely.com), so it is used as the default.
 */
export const SITE_URL = 'https://kafeely.com';

/** Convenience builder for absolute site URLs, e.g. absoluteUrl('og-image.jpg'). */
export function absoluteUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${SITE_URL.replace(/\/$/, '')}/${cleanPath}`;
}

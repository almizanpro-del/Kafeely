import type { Locale } from "@/i18n/config";

const AED = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** AED 128,500 — always latin digits for fintech clarity, both LTR/RTL. */
export function aed(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  }
  return `AED ${AED.format(n)}`;
}

export function num(n: number): string {
  return AED.format(n);
}

export function pct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

/** 12 Nov 2026 */
export function fmtDate(d: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** 12 Nov, 14:30 */
export function fmtDateTime(d: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function daysUntil(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export function relativeDays(d: Date | string, locale: Locale = "en"): string {
  const diff = daysUntil(d);
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en", { numeric: "auto" });
  if (Math.abs(diff) < 31) return rtf.format(diff, "day");
  return fmtDate(d, locale);
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

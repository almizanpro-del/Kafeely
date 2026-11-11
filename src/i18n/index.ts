import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

export const LOCALE_COOKIE = "kafeely_locale";

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<{ locale: Locale; dict: Dictionary; dir: "ltr" | "rtl" }> {
  const locale = await getLocale();
  return { locale, dict: dictionaries[locale], dir: locale === "ar" ? "rtl" : "ltr" };
}

export type { Dictionary };
export { dictionaries };

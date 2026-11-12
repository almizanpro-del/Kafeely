"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLocaleAction } from "@/app/actions";
import type { Locale } from "@/i18n/config";

/** EN / AR switch — flips the whole document direction. */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === "en" ? "ar" : "en";
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground"
      disabled={pending}
      onClick={() => startTransition(() => setLocaleAction(next))}
      aria-label={label}
    >
      <Languages className="size-4" aria-hidden />
      <span className="text-xs font-semibold">{label}</span>
    </Button>
  );
}

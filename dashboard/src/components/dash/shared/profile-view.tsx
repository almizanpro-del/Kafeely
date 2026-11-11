"use client";

import * as React from "react";
import { toast } from "sonner";
import { Settings, ShieldCheck, Bell, Languages, TriangleAlert, MonitorSmartphone } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setLocaleAction } from "@/app/actions";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fmtDate, fmtDateTime } from "@/lib/format";

export function ProfileView({
  fullName, email, roleLabel, organization, jobTitle, memberSince, lastLogin, locale, dict,
}: {
  fullName: string;
  email: string;
  roleLabel: string;
  organization: string | null;
  jobTitle: string | null;
  memberSince: string;
  lastLogin: string | null;
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.profile;
  const [prefs, setPrefs] = React.useState({ email: true, sms: false, digest: true, twoFa: false });

  return (
    <>
      <PageHeader title={t.title} description={t.subtitle} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Account */}
        <SectionCard title={t.account}>
          <div className="mb-5 flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-full border border-[#c5a880]/40 bg-[#c5a880]/15 font-display text-lg font-semibold text-[#dcc39a]">
              {fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-foreground">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge label={roleLabel} tone="gold" />
                {organization && <span className="text-[11px] text-muted-foreground">{organization}</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-name" className="text-xs text-muted-foreground">{t.fullName}</Label>
              <Input id="pf-name" defaultValue={fullName} className="bg-secondary/60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-job" className="text-xs text-muted-foreground">{t.jobTitle}</Label>
              <Input id="pf-job" defaultValue={jobTitle ?? ""} className="bg-secondary/60" />
            </div>
          </div>
          <dl className="mt-5 space-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <div className="flex justify-between"><dt>{t.memberSince}</dt><dd className="tnum">{fmtDate(memberSince, locale)}</dd></div>
            <div className="flex justify-between"><dt>{t.lastLogin}</dt><dd className="tnum">{lastLogin ? fmtDateTime(lastLogin, locale) : "—"}</dd></div>
          </dl>
          <Button
            className="mt-5 bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]"
            onClick={() => toast.success(dict.common.changesSaved)}
          >
            <Settings className="size-4" aria-hidden />
            {dict.common.saveChanges}
          </Button>
        </SectionCard>

        {/* Security */}
        <SectionCard title={t.security}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw-cur" className="text-xs text-muted-foreground">{t.currentPassword}</Label>
                <Input id="pw-cur" type="password" className="bg-secondary/60" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-new" className="text-xs text-muted-foreground">{t.newPassword}</Label>
                <Input id="pw-new" type="password" className="bg-secondary/60" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-conf" className="text-xs text-muted-foreground">{t.confirmPassword}</Label>
                <Input id="pw-conf" type="password" className="bg-secondary/60" />
              </div>
            </div>
            <Button variant="outline" className="border-[#c5a880]/40 text-[#dcc39a] hover:bg-[#c5a880]/10" onClick={() => toast.success(dict.common.changesSaved)}>
              <ShieldCheck className="size-4" aria-hidden />
              {t.updatePassword}
            </Button>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/70 bg-secondary/40 px-4 py-3.5">
              <span>
                <span className="block text-sm font-medium text-foreground">{t.twoFactor}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.twoFactorHint}</span>
              </span>
              <Switch checked={prefs.twoFa} onCheckedChange={(v) => setPrefs((p) => ({ ...p, twoFa: v }))} aria-label={t.twoFactor} />
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.sessions}</p>
              <p className="mb-2.5 text-[11px] text-muted-foreground">{t.sessionsHint}</p>
              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/40 px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm text-foreground">
                  <MonitorSmartphone className="size-4 text-muted-foreground" aria-hidden />
                  {t.thisDevice} · Dubai, AE
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="pulse-dot size-1.5 rounded-full bg-emerald-400" aria-hidden />
                  {dict.status.active}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Communication */}
        <SectionCard title={t.communication}>
          <div className="divide-y divide-border/60">
            {[
              { key: "email" as const, icon: Bell, label: t.emailAlerts, hint: t.emailAlertsHint },
              { key: "sms" as const, icon: Bell, label: t.smsAlerts, hint: t.smsAlertsHint },
              { key: "digest" as const, icon: Bell, label: t.weeklyDigest, hint: t.weeklyDigestHint },
            ].map((row) => (
              <label key={row.key} className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
                <span className="flex items-center gap-3">
                  <row.icon className="size-4 text-muted-foreground" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{row.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{row.hint}</span>
                  </span>
                </span>
                <Switch checked={prefs[row.key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))} aria-label={row.label} />
              </label>
            ))}
          </div>
        </SectionCard>

        {/* Language + danger zone */}
        <div className="space-y-4">
          <SectionCard title={t.language}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Languages className="size-5 text-[#c5a880]" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {locale === "en" ? "English (LTR)" : "العربية (RTL)"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.languageHint}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-[#c5a880]/40 text-[#dcc39a] hover:bg-[#c5a880]/10"
                onClick={() => setLocaleAction(locale === "en" ? "ar" : "en")}
              >
                {dict.common.switchTo}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t.dangerZone} className="border-rose-500/25">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-400" aria-hidden />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t.deleteAccount}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.deleteHint}</p>
                <Button
                  variant="outline"
                  className="mt-3 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                  onClick={() => toast.info(dict.common.requestSubmitted)}
                >
                  {t.deleteAccount}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

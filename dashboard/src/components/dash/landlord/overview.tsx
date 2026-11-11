import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DonutChart, ProgressRows, Sparkline } from "@/components/charts/charts";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { aed, fmtDate, daysUntil, num } from "@/lib/format";
import {
  UNIT_STATUS_TONE, CLAIM_STATUS_TONE, type UnitStatus,
} from "@/lib/types";
import type { LandlordOverview } from "@/lib/data/landlord";
import { Building2, ShieldCheck, FileSignature, ShieldAlert, Wallet, Percent, ArrowRight, TriangleAlert, ShieldPlus, ReceiptText } from "lucide-react";

export const CHART_COLORS: Record<UnitStatus, string> = {
  occupied: "#3dd68c",
  vacant: "#8fa3c8",
  under_notice: "#f0b24a",
  maintenance: "#f26d6d",
};

export function LandlordOverview({
  data, dict, locale, roleSlug,
}: {
  data: LandlordOverview;
  dict: Dictionary;
  locale: Locale;
  roleSlug: string;
}) {
  const t = dict.landlord.overview;
  const units = data.units;
  const leases = data.leases;
  const claims = data.claims;

  const byStatus: Record<UnitStatus, number> = { occupied: 0, vacant: 0, under_notice: 0, maintenance: 0 };
  for (const u of units) byStatus[u.status]++;
  const occupied = byStatus.occupied;
  const occupancy = units.length ? Math.round((occupied / units.length) * 100) : 0;
  const occupiedUnits = units.filter((u) => u.status === "occupied");
  const protectedCount = occupiedUnits.filter((u) => u.protectionStatus === "protected").length;
  const protectionPct = occupiedUnits.length ? Math.round((protectedCount / occupiedUnits.length) * 100) : 0;
  const activeLeases = leases.filter((l) => l.status === "active" || l.status === "expiring_soon");
  const annualRent = activeLeases.reduce((s, l) => s + l.rentAed, 0);
  const openClaims = claims.filter((c) => ["submitted", "under_review", "approved"].includes(c.status)).length;
  const upcoming = activeLeases.filter((l) => daysUntil(l.endDate) <= 90 && daysUntil(l.endDate) >= 0).slice(0, 5);
  const recentClaims = claims.slice(0, 5);

  const trend = Array.from({ length: 12 }, (_, i) => 40 + Math.round(30 * Math.sin(i / 2.2) + i * 2.4));

  if (!units.length) {
    return (
      <>
        <PageHeader title={t.title} description={t.desc} />
        <EmptyState icon={Building2} title={t.noUnits} description={t.noUnitsDesc} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.desc}
        actions={
          <>
            <Link
              href={`/app/${roleSlug}/claims`}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#c5a880] px-4 text-sm font-semibold text-[#0b132b] transition hover:bg-[#d4b98f]"
            >
              <TriangleAlert className="size-4" aria-hidden />
              {dict.landlord.claims.reportIssue}
            </Link>
            <Link
              href={`/app/${roleSlug}/documents`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c5a880]/40 bg-[#c5a880]/10 px-4 text-sm font-medium text-[#dcc39a] transition hover:bg-[#c5a880]/20"
            >
              <ShieldPlus className="size-4" aria-hidden />
              {dict.nav.protection}
            </Link>
            <Link
              href={`/app/${roleSlug}/financials`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-secondary/60 px-4 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <ReceiptText className="size-4" aria-hidden />
              {dict.nav.financials}
            </Link>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={Building2} label={t.units} value={num(units.length)} hint={`${occupied} ${dict.status.occupied.toLowerCase()}`} />
        <StatCard icon={Percent} label={t.occupancy} value={`${occupancy}%`} delta="+2.1%" deltaTone="up" />
        <StatCard icon={ShieldCheck} label={t.protectionCoverage} value={`${protectionPct}%`} accent hint={`${protectedCount}/${occupiedUnits.length}`} />
        <StatCard icon={FileSignature} label={t.activeLeases} value={num(activeLeases.length)} />
        <StatCard icon={ShieldAlert} label={t.openClaims} value={num(openClaims)} deltaTone={openClaims > 3 ? "down" : "neutral"} />
        <StatCard icon={Wallet} label={t.annualRent} value={aed(annualRent, { compact: true })} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title={t.unitStatus}>
          <DonutChart
            data={(Object.keys(byStatus) as UnitStatus[])
              .filter((k) => byStatus[k] > 0)
              .map((k) => ({ label: dict.status[k], value: byStatus[k], color: CHART_COLORS[k] }))}
            centerValue={num(units.length)}
            centerLabel={t.units}
          />
        </SectionCard>

        <SectionCard title={t.protectionMix} description={t.protectedOf.replace("{n}", String(protectedCount)).replace("{m}", String(occupiedUnits.length))}>
          <div className="space-y-5">
            <ProgressRows
              rows={[
                { label: dict.status.protected, value: occupiedUnits.filter((u) => u.protectionStatus === "protected").length, max: occupiedUnits.length, color: "#c5a880" },
                { label: dict.status.pending, value: occupiedUnits.filter((u) => u.protectionStatus === "pending").length, max: occupiedUnits.length, color: "#f0b24a" },
                { label: dict.status.unprotected, value: occupiedUnits.filter((u) => u.protectionStatus === "unprotected").length, max: occupiedUnits.length, color: "#8fa3c8" },
              ]}
            />
            <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{dict.admin.overview.conversionTrend}</span>
                <span className="tnum text-[#c5a880]">+12.4%</span>
              </div>
              <Sparkline values={trend} className="mt-2" />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t.upcomingExpiries}
          actions={
            <Link href={`/app/${roleSlug}/leases`} className="text-xs font-medium text-[#c5a880] hover:underline">
              {dict.common.viewAll}
            </Link>
          }
          bodyClassName="p-0"
        >
          {upcoming.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">—</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {upcoming.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{l.unitCode}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.tenant} · {fmtDate(l.endDate, locale)}</p>
                  </div>
                  <StatusBadge
                    label={dict.landlord.leases.expiresIn.replace("{n}", String(Math.max(daysUntil(l.endDate), 0)))}
                    tone={daysUntil(l.endDate) < 30 ? "danger" : "warning"}
                    dot={false}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Recent claims */}
      <SectionCard
        title={t.recentClaims}
        actions={
          <Link href={`/app/${roleSlug}/claims`} className="inline-flex items-center gap-1 text-xs font-medium text-[#c5a880] hover:underline">
            {dict.common.viewAll}
            <ArrowRight className="size-3 rtl:rotate-180" aria-hidden />
          </Link>
        }
        bodyClassName="p-0"
      >
        {recentClaims.length === 0 ? (
          <EmptyState icon={ShieldAlert} title={dict.landlord.claims.empty} compact className="m-4 border-0" />
        ) : (
          <ul className="divide-y divide-border/60">
            {recentClaims.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    <span className="tnum text-[#c5a880]">{c.ref}</span> · {c.unitCode}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{dict.entity.claimType[c.type]} · {fmtDate(c.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-sm font-semibold text-foreground">{aed(c.amountAed, { compact: true })}</span>
                  <StatusBadge label={dict.status[c.status]} tone={CLAIM_STATUS_TONE[c.status]} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

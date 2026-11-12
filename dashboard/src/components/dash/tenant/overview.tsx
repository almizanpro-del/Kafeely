import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressRows } from "@/components/charts/charts";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { aed, fmtDate, daysUntil, num, relativeDays } from "@/lib/format";
import { PROTECTION_TONE, UNIT_STATUS_TONE, type ProtectionStatus } from "@/lib/types";
import type { getTenantLease, TenantTicketRow } from "@/lib/data/tenant";
import { Home, CalendarDays, Wrench, Receipt, ShieldCheck, TriangleAlert, Download, Coins } from "lucide-react";
import Link from "next/link";

type Lease = NonNullable<Awaited<ReturnType<typeof getTenantLease>>>;

export function TenantOverview({
  lease, tickets, dict, locale, roleSlug,
}: {
  lease: Lease | null;
  tickets: TenantTicketRow[];
  dict: Dictionary;
  locale: Locale;
  roleSlug: string;
}) {
  const t = dict.tenant.overview;
  const openTickets = tickets.filter((x) => ["open", "in_progress"].includes(x.status));

  if (!lease) {
    return (
      <>
        <PageHeader title={t.title} description={t.desc} />
        <EmptyState icon={Home} title={t.noLease} description={t.noLeaseDesc} />
      </>
    );
  }

  const daysLeft = daysUntil(lease.endDate);

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.desc}
        actions={
          <>
            <Link href={`/app/${roleSlug}/maintenance`} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#c5a880] px-4 text-sm font-semibold text-[#0b132b] transition hover:bg-[#d4b98f]">
              <Wrench className="size-4" aria-hidden />
              {t.reportIssue}
            </Link>
            <Link href={`/app/${roleSlug}/claims`} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c5a880]/40 bg-[#c5a880]/10 px-4 text-sm font-medium text-[#dcc39a] transition hover:bg-[#c5a880]/20">
              <TriangleAlert className="size-4" aria-hidden />
              {t.raiseClaim}
            </Link>
            <Link href={`/app/${roleSlug}/documents`} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-secondary/60 px-4 text-sm font-medium text-foreground transition hover:bg-secondary">
              <Download className="size-4" aria-hidden />
              {t.downloadCert}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lease card */}
        <SectionCard title={t.currentLease} className="lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-4">
              <div>
                <p className="font-display text-2xl font-semibold text-foreground">
                  {locale === "ar" && lease.propertyAr ? lease.propertyAr : lease.property}
                </p>
                <p className="tnum mt-0.5 text-sm text-muted-foreground">
                  {lease.unitCode} · Floor {num(lease.floor)} · {num(lease.sizeSqm)} m² · {dict.entity.unitType[lease.type as keyof typeof dict.entity.unitType] ?? lease.type}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t.monthlyRent}</dt>
                  <dd className="tnum mt-0.5 font-semibold text-foreground">{aed(lease.rentAed)}<span className="text-xs font-normal text-muted-foreground"> /{dict.common.per}</span></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t.leasePeriod}</dt>
                  <dd className="tnum mt-0.5 font-medium text-foreground">{fmtDate(lease.startDate, locale)} → {fmtDate(lease.endDate, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{dict.landlord.leases.ejari}</dt>
                  <dd className="tnum mt-0.5 font-medium text-foreground">{lease.ejariNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{dict.role.landlord.label}</dt>
                  <dd className="mt-0.5 font-medium text-foreground">{lease.landlord}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col items-stretch gap-2.5 sm:w-44">
              <div className="rounded-lg border border-border/70 bg-secondary/40 p-3.5 text-center">
                <CalendarDays className="mx-auto size-5 text-[#c5a880]" aria-hidden />
                <p className="tnum mt-2 text-2xl font-semibold text-foreground">{num(Math.max(daysLeft, 0))}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.daysRemaining.replace("{n}", "").trim()}</p>
              </div>
              <StatusBadge
                label={dict.status[lease.protectionStatus as ProtectionStatus]}
                tone={PROTECTION_TONE[lease.protectionStatus as ProtectionStatus]}
                className="justify-center py-1.5"
              />
            </div>
          </div>
        </SectionCard>

        {/* Next payment + instalments */}
        <div className="space-y-4">
          <SectionCard title={t.nextPayment}>
            {lease.nextPayment ? (
              <div>
                <p className="tnum text-2xl font-semibold text-foreground">{aed(lease.nextPayment.amountAed)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.instalment ?? dict.landlord.financials.instalment} {num(lease.nextPayment.installmentNo)} · {relativeDays(lease.nextPayment.dueDate, locale)}
                </p>
                <Link href={`/app/${roleSlug}/payments`} className="mt-3 inline-block text-xs font-medium text-[#c5a880] hover:underline">
                  {dict.tenant.paymentsTenant.title} →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{dict.tenant.paymentsTenant.empty}</p>
            )}
          </SectionCard>
          <StatCard icon={Coins} label={t.paymentsDone} value={`${num(lease.paymentsPaid)} / ${num(lease.paymentsTotal)}`} />
          <StatCard icon={Wrench} label={t.openRequests} value={num(openTickets.length)} deltaTone={openTickets.length ? "down" : "neutral"} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Coverage */}
        <SectionCard title={t.coverageDetails} actions={<Link href={`/app/${roleSlug}/protection`} className="text-xs font-medium text-[#c5a880] hover:underline">{dict.common.viewAll}</Link>}>
          {lease.protectionEnrolled ? (
            <ProgressRows
              rows={[
                { label: dict.tenant.protection.rentDefault, value: 100, max: 100, valueLabel: aed(120000, { compact: true }), color: "#c5a880" },
                { label: dict.tenant.protection.damage, value: 60, max: 100, valueLabel: aed(50000, { compact: true }), color: "#c5a880" },
                { label: dict.tenant.protection.legal, value: 35, max: 100, valueLabel: aed(25000, { compact: true }), color: "#c5a880" },
              ]}
            />
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden />
              <div>
                <p className="text-sm font-medium text-amber-200">{dict.tenant.protection.notEnrolled}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-200/70">{dict.tenant.protection.notEnrolledDesc}</p>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Open requests */}
        <SectionCard
          title={t.openRequests}
          actions={<Link href={`/app/${roleSlug}/maintenance`} className="text-xs font-medium text-[#c5a880] hover:underline">{dict.common.viewAll}</Link>}
          bodyClassName="p-0"
        >
          {openTickets.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-muted-foreground">{dict.tenant.maintenanceTenant.empty}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {openTickets.slice(0, 4).map((tk) => (
                <li key={tk.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{tk.title}</p>
                    <p className="tnum truncate text-xs text-muted-foreground">
                      {tk.ref} · {dict.entity.ticketCategory[tk.category as keyof typeof dict.entity.ticketCategory] ?? tk.category}
                      {tk.scheduledFor ? ` · ${fmtDate(tk.scheduledFor, locale)}` : ""}
                    </p>
                  </div>
                  <StatusBadge label={dict.status[tk.status as "open"] ?? tk.status} tone={tk.status === "open" ? "danger" : "warning"} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* property status chip for visual balance */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <Receipt className="size-3" aria-hidden />
        {dict.common.demoNote}
      </div>
    </>
  );
}

export { UNIT_STATUS_TONE };

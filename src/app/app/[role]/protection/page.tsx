import { guardRole } from "@/lib/page-guard";
import { getTenantLease } from "@/lib/data/tenant";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressRows } from "@/components/charts/charts";
import { PROTECTION_TONE, type ProtectionStatus } from "@/lib/types";
import { aed, fmtDate } from "@/lib/format";
import { ShieldCheck, ShieldOff, FileBadge, Phone, Upload, ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantProtectionPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "tenant") return null;

  const lease = await getTenantLease(session.sub);
  const t = dict.tenant.protection;

  if (!lease) {
    return (
      <>
        <PageHeader title={t.title} description={t.desc} />
        <SectionCard>
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 size-5 text-amber-300" aria-hidden />
            <div>
              <p className="text-sm font-medium">{dict.tenant.overview.noLease}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.notEnrolledDesc}</p>
            </div>
          </div>
        </SectionCard>
      </>
    );
  }

  const steps = [
    { icon: Phone, text: t.step1 },
    { icon: Upload, text: t.step2 },
    { icon: ListChecks, text: t.step3 },
  ];

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title={t.certificate} className="lg:col-span-1">
          {lease.protectionEnrolled ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#c5a880]/30 bg-gradient-to-br from-[#c5a880]/10 to-transparent p-5 text-center">
                <FileBadge className="mx-auto size-8 text-[#c5a880]" aria-hidden />
                <p className="mt-3 font-display text-lg font-semibold text-foreground">{dict.common.brand} {t.certificate}</p>
                <p className="tnum mt-1 text-xs text-muted-foreground">{lease.ref} · {lease.unitCode}</p>
                <div className="mt-3 flex justify-center">
                  <StatusBadge label={t.enrolled} tone="gold" />
                </div>
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t.period}</dt><dd className="tnum font-medium">{fmtDate(lease.startDate, locale)} → {fmtDate(lease.endDate, locale)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{dict.landlord.leases.rent}</dt><dd className="tnum font-medium">{aed(lease.rentAed)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{dict.common.status}</dt><dd><StatusBadge label={dict.status[lease.protectionStatus as ProtectionStatus]} tone={PROTECTION_TONE[lease.protectionStatus as ProtectionStatus]} /></dd></div>
              </dl>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
              <ShieldOff className="size-8 text-amber-300" aria-hidden />
              <p className="text-sm font-medium text-amber-200">{t.notEnrolled}</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{t.notEnrolledDesc}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title={t.coverage} className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <ProgressRows
                rows={[
                  { label: t.rentDefault, value: 100, max: 100, valueLabel: aed(120000, { compact: true }), color: "#c5a880" },
                  { label: t.damage, value: 60, max: 100, valueLabel: aed(50000, { compact: true }), color: "#c5a880" },
                  { label: t.legal, value: 35, max: 100, valueLabel: aed(25000, { compact: true }), color: "#c5a880" },
                ]}
              />
              <dl className="mt-6 space-y-2.5 text-sm">
                <div className="flex justify-between border-t border-border/60 pt-2.5"><dt className="text-muted-foreground">{t.cap}</dt><dd className="tnum font-medium">{aed(120000)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{t.deductible}</dt><dd className="tnum font-medium">{aed(2500)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{t.claimsUsed}</dt><dd className="tnum font-medium">0 / 2</dd></div>
              </dl>
            </div>
            <div className="rounded-xl border border-border/70 bg-secondary/40 p-5">
              <p className="text-sm font-semibold text-foreground">{t.howToClaim}</p>
              <ol className="mt-4 space-y-4">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#c5a880]/30 bg-[#c5a880]/10 text-xs font-bold text-[#dcc39a]">
                      {i + 1}
                    </span>
                    <div>
                      <s.icon className="size-4 text-[#c5a880]" aria-hidden />
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                {t.step3}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

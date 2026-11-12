import { guardRole } from "@/lib/page-guard";
import { getLandlordLeases, getLandlordClaims, getLandlordPayments } from "@/lib/data/landlord";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { MiniBars } from "@/components/charts/charts";
import { PAYMENT_STATUS_TONE, type PaymentStatus } from "@/lib/types";
import { aed, fmtDate, num } from "@/lib/format";
import { Wallet, ShieldCheck, Landmark, Hourglass, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = { cheque: "Cheque", bank_transfer: "Transfer", card: "Card" };

export default async function LandlordFinancialsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "landlord") return null;

  const [leases, claims, payments] = await Promise.all([
    getLandlordLeases(session.sub),
    getLandlordClaims(session.sub),
    getLandlordPayments(session.sub),
  ]);

  const t = dict.landlord.financials;
  const active = leases.filter((l) => ["active", "expiring_soon"].includes(l.status));
  const contractedRent = active.reduce((s, l) => s + l.rentAed, 0);
  const premiums = Math.round(contractedRent * 0.014); // 1.4% indicative premium
  const payouts = claims.filter((c) => ["approved", "settled"].includes(c.status)).reduce((s, c) => s + c.amountAed, 0);
  const pending = claims.filter((c) => ["submitted", "under_review"].includes(c.status)).reduce((s, c) => s + c.amountAed, 0);

  // trailing 12 months premiums vs payouts (deterministic distribution)
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return { label: d.toLocaleDateString("en", { month: "short" }), premium: Math.round(premiums / 12), payout: 0 };
  });
  for (const c of claims) {
    if (!["approved", "settled"].includes(c.status)) continue;
    const d = new Date(c.createdAt);
    const mIdx = 11 - Math.floor((Date.now() - d.getTime()) / (30 * 86_400_000));
    if (mIdx >= 0 && mIdx < 12) months[mIdx].payout += c.amountAed;
  }

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label={t.contractedRent} value={aed(contractedRent, { compact: true })} hint={`${active.length} ${dict.landlord.overview.activeLeases.toLowerCase()}`} />
        <StatCard icon={ShieldCheck} label={t.premiums} value={aed(premiums, { compact: true })} accent hint="1.4% indicative" />
        <StatCard icon={Landmark} label={t.payouts} value={aed(payouts, { compact: true })} delta="+AED 42K" deltaTone="up" />
        <StatCard icon={Hourglass} label={t.pendingClaims} value={aed(pending, { compact: true })} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title={t.premiumsVsPayouts} className="lg:col-span-3">
          <MiniBars
            series={[
              { name: t.premiums, color: "#c5a880", values: months.map((m) => m.premium) },
              { name: t.payouts, color: "#3dd68c", values: months.map((m) => m.payout) },
            ]}
            labels={months.map((m) => m.label)}
            format="aedCompact"
            height={170}
          />
        </SectionCard>

        <SectionCard title={t.paymentSchedule} bodyClassName="p-0" className="lg:col-span-2">
          <ul className="max-h-[420px] divide-y divide-border/60 overflow-y-auto thin-scroll">
            {payments.slice(0, 12).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="tnum">{p.unitCode}</span> · {t.instalment} {num(p.installmentNo)}
                  </p>
                  <p className="tnum text-xs text-muted-foreground">
                    {t.dueDate}: {fmtDate(p.dueDate, locale)} · {METHOD_LABEL[p.method] ?? p.method}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tnum text-sm font-semibold">{aed(p.amountAed, { compact: true })}</span>
                  <StatusBadge label={dict.status[p.status as PaymentStatus] ?? p.status} tone={PAYMENT_STATUS_TONE[p.status as PaymentStatus] ?? "neutral"} />
                </div>
              </li>
            ))}
            {payments.length === 0 && (
              <li className="px-5 py-10 text-center text-xs text-muted-foreground">{t.empty}</li>
            )}
          </ul>
        </SectionCard>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <TrendingUp className="size-3" aria-hidden />
        {dict.common.demoNote}
      </p>
    </>
  );
}

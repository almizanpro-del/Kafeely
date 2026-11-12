import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressRows } from "@/components/charts/charts";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { aed, fmtDate, num, relativeDays } from "@/lib/format";
import { LEAD_STAGE_TONE, type LeadStage } from "@/lib/types";
import { KanbanSquare, Coins, Trophy, Percent, Wallet, Hourglass } from "lucide-react";
import type { LeadRow } from "@/lib/data/broker";
import type { getCommissions } from "@/lib/data/broker";

type Commissions = Awaited<ReturnType<typeof getCommissions>>;

export function BrokerOverview({
  leads, commissions, dict, locale, roleSlug,
}: {
  leads: LeadRow[];
  commissions: Commissions;
  dict: Dictionary;
  locale: Locale;
  roleSlug: string;
}) {
  const t = dict.broker.overview;
  const stages: LeadStage[] = ["new", "contacted", "viewing", "offer", "negotiation", "won", "lost"];
  const byStage = Object.fromEntries(stages.map((s) => [s, leads.filter((l) => l.stage === s).length])) as Record<LeadStage, number>;
  const activePipeline = leads.filter((l) => !["won", "lost"].includes(l.stage));
  const pipelineValue = activePipeline.reduce((s, l) => s + (l.budgetAed ?? 0), 0);
  const won = byStage.won;
  const closed = leads.filter((l) => ["won", "lost"].includes(l.stage)).length;
  const conversion = closed ? Math.round((won / closed) * 100) : 0;
  const earned = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amountAed, 0);
  const pendingC = commissions.filter((c) => c.status !== "paid").reduce((s, c) => s + c.amountAed, 0);
  const recent = leads.slice(0, 6);
  const max = Math.max(...stages.map((s) => byStage[s]), 1);

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={KanbanSquare} label={t.activePipeline} value={num(activePipeline.length)} />
        <StatCard icon={Wallet} label={t.pipelineValue} value={aed(pipelineValue, { compact: true })} />
        <StatCard icon={Trophy} label={t.wonThisQuarter} value={num(won)} delta="+3" deltaTone="up" />
        <StatCard icon={Percent} label={t.conversionRate} value={`${conversion}%`} deltaTone={conversion >= 50 ? "up" : "neutral"} />
        <StatCard icon={Coins} label={t.commissionEarned} value={aed(earned, { compact: true })} accent />
        <StatCard icon={Hourglass} label={t.pendingCommission} value={aed(pendingC, { compact: true })} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title={t.stageBreakdown}>
          <ProgressRows
            rows={stages.map((s) => ({
              label: dict.status[s],
              value: byStage[s],
              max,
              color: s === "won" ? "#3dd68c" : s === "lost" ? "#f26d6d" : "#c5a880",
            }))}
          />
        </SectionCard>

        <SectionCard
          title={t.recentLeads}
          actions={<a href={`/app/${roleSlug}/pipeline`} className="text-xs font-medium text-[#c5a880] hover:underline">{dict.common.viewAll}</a>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border/60">
            {recent.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{l.clientName}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.interest ?? "—"} · {relativeDays(l.updatedAt, locale)}</p>
                </div>
                <StatusBadge label={dict.status[l.stage as LeadStage]} tone={LEAD_STAGE_TONE[l.stage as LeadStage]} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t.activityFeed} bodyClassName="p-0">
          <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto thin-scroll">
            {leads.slice(0, 8).map((l) => (
              <li key={l.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#c5a880]" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">
                    <span className="font-medium">{l.clientName}</span> — {dict.status[l.stage as LeadStage]}
                  </p>
                  <p className="tnum text-[10px] text-muted-foreground">{fmtDate(l.updatedAt, locale)}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressRows } from "@/components/charts/charts";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { aed, num, relativeDays } from "@/lib/format";
import { LEAD_STAGE_TONE, type LeadStage } from "@/lib/types";
import { Target, Building2, Users, Handshake } from "lucide-react";
import type { getAgentTargets, getAgencyTeam, getAgentLeads } from "@/lib/data/agent";

type Targets = Awaited<ReturnType<typeof getAgentTargets>>;
type Team = Awaited<ReturnType<typeof getAgencyTeam>>;
type Leads = Awaited<ReturnType<typeof getAgentLeads>>;

const METRIC_FORMAT: Record<string, (n: number) => string> = {
  deals: (n) => num(n),
  listings: (n) => num(n),
  revenue: (n) => aed(n, { compact: true }),
};

export function AgentOverview({
  targets, team, leads, dict, locale, roleSlug, fullName,
}: {
  targets: Targets;
  team: Team;
  leads: Leads;
  dict: Dictionary;
  locale: Locale;
  roleSlug: string;
  fullName: string;
}) {
  const t = dict.agent.overview;
  const q4 = targets.filter((x) => x.period === "2026-Q4");
  const myLeadsActive = leads.filter((l) => !["won", "lost"].includes(l.stage));
  const teamSorted = [...team].sort((a, b) => b.dealsActual - a.dealsActual);
  const myRank = teamSorted.findIndex((m) => m.name === fullName) + 1;

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Target} label={t.deals} value={num(q4.find((x) => x.metric === "deals")?.actual ?? 0)} delta={`${q4.find((x) => x.metric === "deals")?.target ?? 0} target`} hint={myRank ? `#${myRank} ${dict.agent.team.agencyTotal.toLowerCase()}` : undefined} />
        <StatCard icon={Building2} label={t.listings} value={num(q4.find((x) => x.metric === "listings")?.actual ?? 0)} />
        <StatCard icon={Handshake} label={t.myLeads} value={num(myLeadsActive.length)} />
        <StatCard icon={Users} label={dict.agent.team.title} value={num(team.length)} hint={dict.agent.team.quarterlyTarget.toLowerCase()} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t.q4Targets}>
          <ProgressRows
            rows={q4.map((x) => {
              const pctVal = x.target ? Math.round((x.actual / x.target) * 100) : 0;
              return {
                label: `${dict.agent.targets.metric}: ${x.metric} · ${pctVal}%`,
                value: x.actual,
                max: x.target,
                color: pctVal >= 75 ? "#3dd68c" : pctVal >= 50 ? "#c5a880" : "#f0b24a",
                valueLabel: `${METRIC_FORMAT[x.metric]?.(x.actual) ?? x.actual} / ${METRIC_FORMAT[x.metric]?.(x.target) ?? x.target}`,
              };
            })}
          />
        </SectionCard>

        <SectionCard
          title={t.agencyLeaderboard}
          actions={<a href={`/app/${roleSlug}/team`} className="text-xs font-medium text-[#c5a880] hover:underline">{dict.common.viewAll}</a>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border/60">
            {teamSorted.map((m, i) => {
              const pctVal = m.dealsTarget ? Math.round((m.dealsActual / m.dealsTarget) * 100) : 0;
              return (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className={`tnum grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-[#c5a880] text-[#0b132b]" : "bg-secondary text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                      <span className="tnum shrink-0 text-xs text-muted-foreground">
                        {num(m.dealsActual)}/{num(m.dealsTarget)} · {pctVal}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-[#c5a880] transition-all duration-700" style={{ width: `${Math.min(pctVal, 100)}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title={t.myLeads} bodyClassName="p-0">
        <ul className="divide-y divide-border/60">
          {leads.slice(0, 6).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{l.clientName}</p>
                <p className="truncate text-xs text-muted-foreground">{l.interest ?? "—"} · {relativeDays(l.updatedAt, locale)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {l.budgetAed ? <span className="tnum text-sm">{aed(l.budgetAed, { compact: true })}</span> : null}
                <StatusBadge label={dict.status[l.stage as LeadStage]} tone={LEAD_STAGE_TONE[l.stage as LeadStage]} />
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

    </>
  );
}

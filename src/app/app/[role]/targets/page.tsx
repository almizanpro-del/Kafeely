import { guardRole } from "@/lib/page-guard";
import { getAgentTargets } from "@/lib/data/agent";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { ProgressRows } from "@/components/charts/charts";
import { aed, num } from "@/lib/format";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

const FORMAT: Record<string, (n: number) => string> = {
  deals: (n) => num(n),
  listings: (n) => num(n),
  revenue: (n) => aed(n, { compact: true }),
};

export default async function TargetsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict } = await guardRole(slug);
  if (role !== "agent") return null;
  const targets = await getAgentTargets(session.sub);

  const current = targets.filter((x) => x.period === "2026-Q4");
  const history = targets.filter((x) => x.period !== "2026-Q4");

  return (
    <>
      <PageHeader title={dict.agent.targets.title} description={dict.agent.targets.desc} />

      <SectionCard title={dict.agent.targets.current}>
        <ProgressRows
          rows={current.map((x) => {
            const pctVal = x.target ? Math.round((x.actual / x.target) * 100) : 0;
            return {
              label: `${x.metric} · ${pctVal}% ${dict.agent.targets.achievement.toLowerCase()}`,
              value: x.actual,
              max: x.target,
              color: pctVal >= 75 ? "#3dd68c" : pctVal >= 50 ? "#c5a880" : "#f0b24a",
              valueLabel: `${FORMAT[x.metric]?.(x.actual) ?? x.actual} / ${FORMAT[x.metric]?.(x.target) ?? x.target}`,
            };
          })}
        />
      </SectionCard>

      <SectionCard title={dict.agent.targets.history}>
        <ul className="space-y-3">
          {history.map((x) => {
            const pctVal = x.target ? Math.round((x.actual / x.target) * 100) : 0;
            return (
              <li key={x.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/40 px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm text-foreground">
                  <Target className="size-4 text-muted-foreground" aria-hidden />
                  <span className="font-medium">{x.period}</span>
                  <span className="text-xs capitalize text-muted-foreground">{x.metric}</span>
                </span>
                <span className="tnum text-sm">
                  <span className="font-semibold">{FORMAT[x.metric]?.(x.actual) ?? x.actual}</span>
                  <span className="text-muted-foreground"> / {FORMAT[x.metric]?.(x.target) ?? x.target}</span>
                  <span className={`ms-2.5 text-xs font-semibold ${pctVal >= 100 ? "text-emerald-400" : "text-[#c5a880]"}`}>{pctVal}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </>
  );
}

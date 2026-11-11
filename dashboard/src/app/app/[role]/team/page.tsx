import { guardRole } from "@/lib/page-guard";
import { getAgencyTeam } from "@/lib/data/agent";
import { db } from "@/lib/db";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ProgressRows } from "@/components/charts/charts";
import { aed, num } from "@/lib/format";
import { UsersRound, Trophy, Handshake, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict } = await guardRole(slug);
  if (role !== "agent") return null;

  const user = await db.user.findUnique({ where: { id: session.sub } });
  const team = await getAgencyTeam(user?.agencyId ?? "none");

  const dealsT = team.reduce((s, m) => s + m.dealsTarget, 0);
  const dealsA = team.reduce((s, m) => s + m.dealsActual, 0);
  const revT = team.reduce((s, m) => s + m.revenueTarget, 0);
  const revA = team.reduce((s, m) => s + m.revenueActual, 0);
  const listT = team.reduce((s, m) => s + m.listingsTarget, 0);
  const listA = team.reduce((s, m) => s + m.listingsActual, 0);

  const t = dict.agent.team;
  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} label={t.agent} value={num(team.length)} />
        <StatCard icon={Handshake} label={t.dealsClosed} value={`${num(dealsA)} / ${num(dealsT)}`} delta={`${Math.round((dealsA / (dealsT || 1)) * 100)}%`} deltaTone="up" />
        <StatCard icon={Building2} label={t.listings} value={`${num(listA)} / ${num(listT)}`} />
        <StatCard icon={Trophy} label={t.revenue} value={aed(revA, { compact: true })} hint={`${t.quarterlyTarget}: ${aed(revT, { compact: true })}`} accent />
      </div>

      <SectionCard title={t.agencyTotal} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 text-start font-medium">{t.agent}</th>
                <th className="px-5 py-3 text-start font-medium">{t.dealsClosed}</th>
                <th className="px-5 py-3 text-start font-medium">{t.listings}</th>
                <th className="px-5 py-3 text-start font-medium">{t.revenue}</th>
                <th className="px-5 py-3 text-start font-medium">{t.progress}</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const pctVal = m.dealsTarget ? Math.round((m.dealsActual / m.dealsTarget) * 100) : 0;
                return (
                  <tr key={m.id} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-full bg-[#c5a880]/15 text-[10px] font-semibold text-[#dcc39a]">{m.avatarSeed}</span>
                        <span>
                          <span className="block font-medium text-foreground">{m.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{dict.role[m.role as "agent"]?.label}</span>
                        </span>
                      </span>
                    </td>
                    <td className="tnum px-5 py-3.5 text-foreground">{num(m.dealsActual)} / {num(m.dealsTarget)}</td>
                    <td className="tnum px-5 py-3.5 text-foreground">{num(m.listingsActual)} / {num(m.listingsTarget)}</td>
                    <td className="tnum px-5 py-3.5 text-foreground">{aed(m.revenueActual, { compact: true })} / {aed(m.revenueTarget, { compact: true })}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-[#c5a880] transition-all duration-700" style={{ width: `${Math.min(pctVal, 100)}%` }} />
                        </div>
                        <span className="tnum text-xs text-muted-foreground">{pctVal}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title={dict.agent.targets.achievement}>
        <ProgressRows
          rows={[
            { label: dict.agent.overview.deals, value: dealsA, max: dealsT || 1, color: "#c5a880", valueLabel: `${Math.round((dealsA / (dealsT || 1)) * 100)}%` },
            { label: dict.agent.overview.listings, value: listA, max: listT || 1, color: "#3dd68c", valueLabel: `${Math.round((listA / (listT || 1)) * 100)}%` },
            { label: dict.agent.overview.revenue, value: revA, max: revT || 1, color: "#8fa3c8", valueLabel: `${Math.round((revA / (revT || 1)) * 100)}%` },
          ]}
        />
      </SectionCard>
    </>
  );
}

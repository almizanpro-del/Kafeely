import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ProgressRows, FunnelBars, Sparkline } from "@/components/charts/charts";
import type { Dictionary } from "@/i18n";
import { fmtDateTime, num } from "@/lib/format";
import { ROLES } from "@/lib/types";
import { Users, Inbox, ShieldCheck, ShieldAlert, Activity, ServerCog } from "lucide-react";
import type { getAdminOverview } from "@/lib/data/admin";

type Data = Awaited<ReturnType<typeof getAdminOverview>>;

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#f26d6d", landlord: "#c5a880", tenant: "#3dd68c",
  broker: "#8fa3c8", agent: "#b48ead", facility: "#f0b24a", leasing: "#5dd6c0",
};

export function AdminOverview({ data, dict }: { data: Data; dict: Dictionary }) {
  const t = dict.admin.overview;
  const funnel = [
    { label: dict.status.new, value: data.waitlistByStatus.new ?? 0 },
    { label: dict.status.contacted, value: data.waitlistByStatus.contacted ?? 0 },
    { label: dict.status.qualified, value: data.waitlistByStatus.qualified ?? 0 },
    { label: dict.status.converted, value: data.waitlistByStatus.converted ?? 0 },
  ];
  const trend = data.signupTrend.map((v, i) => v + i);

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.desc}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="pulse-dot size-1.5 rounded-full bg-emerald-400" aria-hidden />
            {t.healthy}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label={t.totalUsers} value={num(data.totalUsers)} delta="+6" deltaTone="up" hint={dict.admin.users.title} />
        <StatCard icon={Inbox} label={t.waitlistEntries} value={num(data.waitlistTotal)} delta={`${data.conversionPct}% ${t.conversion.toLowerCase()}`} deltaTone="up" accent />
        <StatCard icon={ShieldCheck} label={t.activeProtections} value={num(data.protectedUnits)} hint={`${num(data.occupiedUnits)} ${dict.status.occupied.toLowerCase()}`} />
        <StatCard icon={ShieldAlert} label={t.openClaims} value={num(data.openClaims)} deltaTone={data.openClaims > 6 ? "down" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title={t.usersByRole}>
          <ProgressRows
            rows={ROLES.map((r) => ({
              label: dict.role[r].label,
              value: data.byRole[r] ?? 0,
              max: Math.max(...ROLES.map((x) => data.byRole[x] ?? 0), 1),
              color: ROLE_COLORS[r],
            }))}
          />
        </SectionCard>

        <SectionCard title={t.waitlistFunnel}>
          <FunnelBars steps={funnel} />
        </SectionCard>

        <SectionCard title={t.conversionTrend}>
          <Sparkline values={trend} height={90} />
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              { label: dict.status.new, value: data.waitlistByStatus.new ?? 0 },
              { label: dict.status.converted, value: data.waitlistByStatus.converted ?? 0 },
              { label: t.conversion, value: `${data.conversionPct}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border/70 bg-secondary/40 p-2.5">
                <p className="tnum text-lg font-semibold text-foreground">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard
          title={t.recentAudit}
          actions={<span className="text-xs text-muted-foreground">{dict.nav.auditLog} →</span>}
          bodyClassName="p-0"
          className="lg:col-span-3"
        >
          <ul className="divide-y divide-border/60">
            {data.recentAudit.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{a.actorName}</span>
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    <span className="tnum text-xs text-[#c5a880]">{a.action}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <span className="tnum shrink-0 text-[10px] text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t.systemHealth} className="lg:col-span-2">
          <ul className="space-y-3">
            {[
              { name: "API", value: "99.98%", ok: true, icon: Activity },
              { name: dict.admin.system.dbHealth, value: "12 ms", ok: true, icon: ServerCog },
              { name: dict.admin.system.queueDepth, value: "0 jobs", ok: true, icon: ServerCog },
            ].map((s) => (
              <li key={s.name} className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/40 px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm text-foreground">
                  <s.icon className="size-4 text-muted-foreground" aria-hidden />
                  {s.name}
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="tnum font-medium">{s.value}</span>
                  <span className="pulse-dot size-1.5 rounded-full bg-emerald-400" aria-label={dict.admin.system.operational} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-[#c5a880]/25 bg-[#c5a880]/[0.06] px-4 py-3">
            <span className="text-xs text-muted-foreground">{dict.admin.overview.claimsByStatus}</span>
            <span className="tnum text-xs font-semibold text-[#dcc39a]">{num(data.openClaims)} {dict.status.under_review.toLowerCase()}+</span>
          </div>
        </SectionCard>
      </div>

    </>
  );
}

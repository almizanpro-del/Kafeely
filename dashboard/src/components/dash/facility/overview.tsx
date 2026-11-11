import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Heatmap, ProgressRows } from "@/components/charts/charts";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fmtDate, num } from "@/lib/format";
import { Building2, Wrench, AlertTriangle, Percent, ClipboardCheck } from "lucide-react";
import type { getFmProperties, FmTicketRow, getFmInspections } from "@/lib/data/facility";

type Props = Awaited<ReturnType<typeof getFmProperties>>;
type Inspections = Awaited<ReturnType<typeof getFmInspections>>;

const CATEGORY_KEYS = ["hvac", "plumbing", "electrical", "cleaning", "security", "other"] as const;

export function FacilityOverview({
  properties, tickets, inspections, dict, locale,
}: {
  properties: Props;
  tickets: FmTicketRow[];
  inspections: Inspections;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.facility.overview;
  const unitsTotal = properties.reduce((s, p) => s + p.unitsTotal, 0);
  const occupied = properties.reduce((s, p) => s + p.byStatus.occupied, 0);
  const occupancy = unitsTotal ? Math.round((occupied / unitsTotal) * 100) : 0;
  const openTickets = tickets.filter((x) => ["open", "in_progress"].includes(x.status));
  const slaRisk = tickets.filter((x) => x.status === "open" && x.priority === "urgent").length;
  const upcoming = inspections.filter((i) => i.status === "scheduled").slice(0, 5);
  const recent = tickets.slice(0, 6);

  // heatmap: properties × categories (last 30d)
  const values = properties.map((p) =>
    CATEGORY_KEYS.map((c) => tickets.filter((tk) => tk.property === p.name && tk.category === c).length)
  );

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Building2} label={t.buildings} value={num(properties.length)} />
        <StatCard icon={Building2} label={t.totalUnits} value={num(unitsTotal)} />
        <StatCard icon={Wrench} label={t.openTickets} value={num(openTickets.length)} deltaTone={openTickets.length > 6 ? "down" : "neutral"} />
        <StatCard icon={AlertTriangle} label={t.slaToday} value={num(slaRisk)} deltaTone={slaRisk ? "down" : "up"} accent={slaRisk > 0} />
        <StatCard icon={Percent} label={t.occupancy} value={`${occupancy}%`} delta="+1.8%" deltaTone="up" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title={t.issueHeatmap} className="lg:col-span-3">
          <Heatmap
            rowLabels={properties.map((p) => p.name)}
            colLabels={CATEGORY_KEYS.map((c) => dict.entity.ticketCategory[c])}
            values={values}
            lowLabel={t.low}
            highLabel={t.high}
          />
        </SectionCard>

        <SectionCard title={t.ticketsByCategory} className="lg:col-span-2">
          <ProgressRows
            rows={CATEGORY_KEYS.map((c) => ({
              label: dict.entity.ticketCategory[c],
              value: tickets.filter((tk) => tk.category === c).length,
              max: Math.max(...CATEGORY_KEYS.map((x) => tickets.filter((tk) => tk.category === x).length), 1),
              color: "#c5a880",
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={t.recentTickets}
          actions={<a href="tickets" className="text-xs font-medium text-[#c5a880] hover:underline">{dict.common.viewAll}</a>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border/60">
            {recent.map((tk) => (
              <li key={tk.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{tk.title}</p>
                  <p className="tnum truncate text-xs text-muted-foreground">{tk.ref} · {tk.property}{tk.unitCode ? ` · ${tk.unitCode}` : ""}</p>
                </div>
                <StatusBadge label={dict.status[tk.status as "open"] ?? tk.status} tone={tk.status === "open" ? "danger" : tk.status === "in_progress" ? "warning" : "success"} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title={t.upcomingInspections}
          actions={<a href="inspections" className="text-xs font-medium text-[#c5a880] hover:underline">{dict.common.viewAll}</a>}
          bodyClassName="p-0"
        >
          {upcoming.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-muted-foreground">{dict.facility.inspections.empty}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {upcoming.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {dict.entity.inspectionType[i.type as keyof typeof dict.entity.inspectionType] ?? i.type} · {i.property}
                    </p>
                    <p className="tnum truncate text-xs text-muted-foreground">{fmtDate(i.scheduledFor, locale)} · {i.inspector}</p>
                  </div>
                  <ClipboardCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}

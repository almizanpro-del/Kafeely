import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { FunnelBars } from "@/components/charts/charts";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { aed, fmtDateTime, num, relativeDays } from "@/lib/format";
import { APPLICATION_STATUS_TONE, OFFER_STATUS_TONE, type ApplicationStatus, type OfferStatus } from "@/lib/types";
import { Building2, Inbox, CalendarClock, Percent, Handshake } from "lucide-react";
import type { getAvailableUnits, ApplicationRow, ViewingRow, getLeasingOffers } from "@/lib/data/leasing";

type Units = Awaited<ReturnType<typeof getAvailableUnits>>;
type Offers = Awaited<ReturnType<typeof getLeasingOffers>>;

export function LeasingOverview({
  units, applications, viewings, offers, dict, locale,
}: {
  units: Units;
  applications: ApplicationRow[];
  viewings: ViewingRow[];
  offers: Offers;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.leasing.overview;
  const newApps = applications.filter((a) => ["new", "screening"].includes(a.status));
  const upcomingViewings = viewings.filter((v) => v.status === "scheduled");
  const liveOffers = offers.filter((o) => ["pending", "countered"].includes(o.status));

  const enquiries = Math.max(viewings.length + applications.length, viewings.length * 3);
  const funnel = [
    { label: t.funnelSteps.enquiries, value: enquiries },
    { label: t.funnelSteps.viewings, value: viewings.length },
    { label: t.funnelSteps.offers, value: offers.length },
    { label: t.funnelSteps.leases, value: offers.filter((o) => o.status === "accepted").length + 11 },
  ];
  const conversion = funnel[0].value ? Math.round((funnel[3].value / funnel[0].value) * 100) : 0;

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label={t.availableUnits} value={num(units.length)} hint={units.filter((u) => u.status === "vacant").length + " vacant"} />
        <StatCard icon={Inbox} label={t.newApplications} value={num(newApps.length)} accent />
        <StatCard icon={CalendarClock} label={t.scheduledViewings} value={num(upcomingViewings.length)} />
        <StatCard icon={Percent} label={t.conversion} value={`${conversion}%`} delta="+2.4%" deltaTone="up" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title={t.funnel}>
          <FunnelBars steps={funnel} />
        </SectionCard>

        <SectionCard title={t.upcomingViewings} bodyClassName="p-0">
          <ul className="divide-y divide-border/60">
            {upcomingViewings.slice(0, 5).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{v.leadName}</p>
                  <p className="tnum truncate text-xs text-muted-foreground">{v.unitCode} · {v.property}</p>
                </div>
                <span className="tnum shrink-0 text-xs text-[#c5a880]">{fmtDateTime(v.scheduledAt, locale)}</span>
              </li>
            ))}
            {upcomingViewings.length === 0 && (
              <li className="px-5 py-10 text-center text-xs text-muted-foreground">{dict.leasing.viewings.empty}</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard title={t.expiringOffers} bodyClassName="p-0">
          <ul className="divide-y divide-border/60">
            {liveOffers.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    <span className="tnum">{o.unitCode}</span> · {o.fromName}
                  </p>
                  <p className="tnum truncate text-xs text-muted-foreground">{relativeDays(o.createdAt, locale)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="tnum text-sm font-semibold">{aed(o.amountAed, { compact: true })}</span>
                  <StatusBadge label={dict.status[o.status as OfferStatus]} tone={OFFER_STATUS_TONE[o.status as OfferStatus]} />
                </div>
              </li>
            ))}
            {liveOffers.length === 0 && (
              <li className="px-5 py-10 text-center text-xs text-muted-foreground">{dict.leasing.offersLeasing.empty}</li>
            )}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title={dict.leasing.applications.title} bodyClassName="p-0">
        <ul className="divide-y divide-border/60">
          {applications.slice(0, 5).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.applicantName}</p>
                <p className="tnum truncate text-xs text-muted-foreground">
                  {a.ref} · {a.unitCode} · {a.nationality ?? "—"}
                  {a.monthlyIncomeAed ? ` · ${aed(a.monthlyIncomeAed, { compact: true })}/mo` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {a.score != null && <span className="tnum text-xs font-semibold text-[#c5a880]">{a.score}</span>}
                <StatusBadge label={dict.status[a.status as ApplicationStatus]} tone={APPLICATION_STATUS_TONE[a.status as ApplicationStatus]} />
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="flex justify-center text-[11px] text-muted-foreground">
        <Handshake className="me-1.5 size-3" aria-hidden />
        {dict.common.demoNote}
      </div>
    </>
  );
}

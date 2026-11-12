"use client";

import * as React from "react";
import { FileSignature, ShieldCheck } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/page-header";
import { aed, fmtDate, daysUntil } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { LandlordLeaseRow } from "@/lib/data/landlord";
import { LEASE_TONE } from "./lease-tone";

export function LeasesView({
  leases, dict, locale,
}: {
  leases: LandlordLeaseRow[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.landlord.leases;
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const filtered = React.useMemo(
    () =>
      leases.filter((l) => {
        if (status !== "all" && l.status !== status) return false;
        const q = search.toLowerCase();
        return !q || [l.ref, l.unitCode, l.tenant, l.ejariNumber ?? ""].some((v) => v.toLowerCase().includes(q));
      }),
    [leases, search, status]
  );

  const expiring = leases
    .filter((l) => ["active", "expiring_soon"].includes(l.status) && daysUntil(l.endDate) <= 90 && daysUntil(l.endDate) >= 0)
    .sort((a, b) => daysUntil(a.endDate) - daysUntil(b.endDate));

  const columns: Column<LandlordLeaseRow>[] = [
    { key: "ref", header: t.ref, sortable: true, render: (l) => <span className="tnum font-semibold text-foreground">{l.ref}</span> },
    {
      key: "unitCode", header: dict.landlord.units.unit, sortable: true,
      render: (l) => <span><span className="tnum text-foreground">{l.unitCode}</span><span className="block text-xs text-muted-foreground">{l.property}</span></span>,
    },
    { key: "tenant", header: t.tenant, sortable: true, render: (l) => <span className="text-foreground">{l.tenant}</span> },
    {
      key: "endDate", header: t.period, sortable: true,
      render: (l) => <span className="tnum text-xs text-muted-foreground">{fmtDate(l.startDate, locale)} → {fmtDate(l.endDate, locale)}</span>,
    },
    { key: "rentAed", header: t.rent, sortable: true, render: (l) => <span className="tnum">{aed(l.rentAed)}</span> },
    { key: "paymentFrequency", header: t.cheques, sortable: true, render: (l) => <span className="tnum text-muted-foreground">{l.paymentFrequency}×</span> },
    { key: "ejariNumber", header: t.ejari, render: (l) => <span className="tnum text-xs text-muted-foreground">{l.ejariNumber ?? "—"}</span> },
    {
      key: "protectionEnrolled", header: t.protection, sortable: true,
      render: (l) => <StatusBadge label={l.protectionEnrolled ? dict.status.protected : dict.status.unprotected} tone={l.protectionEnrolled ? "gold" : "neutral"} />,
    },
    { key: "status", header: dict.common.status, sortable: true, render: (l) => <StatusBadge label={dict.status[l.status]} tone={LEASE_TONE[l.status]} /> },
  ];

  return (
    <div className="space-y-6">
      {expiring.length > 0 && (
        <SectionCard title={t.upcomingSection} bodyClassName="p-0">
          <ul className="divide-y divide-border/60">
            {expiring.slice(0, 4).map((l) => {
              const d = daysUntil(l.endDate);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium"><span className="tnum">{l.unitCode}</span> · {l.tenant}</p>
                    <p className="tnum text-xs text-muted-foreground">{fmtDate(l.endDate, locale)} · {l.property}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tnum text-sm font-semibold text-foreground">{aed(l.rentAed, { compact: true })}</span>
                    <StatusBadge label={t.expiresIn.replace("{n}", String(d))} tone={d < 30 ? "danger" : "warning"} dot={false} />
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={dict.common.searchPlaceholder}
        filters={[
          { value: status, onChange: setStatus, options: [{ value: "all", label: dict.common.all }, ...(["active", "expiring_soon", "upcoming", "terminated"] as const).map((s) => ({ value: s, label: dict.status[s] }))], ariaLabel: dict.common.status },
        ]}
        onExport={() => import("@/components/shared/data-table").then((m) => m.downloadCsv(filtered, columns, "kafeely-leases.csv"))}
        emptyState={<EmptyState icon={FileSignature} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </div>
  );
}

export function ProtectionHint() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#c5a880]">
      <ShieldCheck className="size-3.5" aria-hidden />
    </span>
  );
}

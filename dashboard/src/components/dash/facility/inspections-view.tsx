"use client";

import * as React from "react";
import { ClipboardCheck } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { fmtDate, num } from "@/lib/format";
import { INSPECTION_STATUS_TONE, type InspectionStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { getFmInspections } from "@/lib/data/facility";

type Row = Awaited<ReturnType<typeof getFmInspections>>[number];

export function InspectionsView({ inspections, dict, locale }: { inspections: Row[]; dict: Dictionary; locale: Locale }) {
  const t = dict.facility.inspections;
  const [search, setSearch] = React.useState("");

  const filtered = inspections.filter((i) => {
    const q = search.toLowerCase();
    return !q || i.property.toLowerCase().includes(q) || (i.unitCode ?? "").toLowerCase().includes(q) || (i.inspector ?? "").toLowerCase().includes(q);
  });

  const columns: Column<Row>[] = [
    {
      key: "property", header: dict.landlord.units.property, sortable: true,
      render: (i) => (
        <span>
          <span className="block font-medium text-foreground">{i.property}</span>
          {i.unitCode && <span className="tnum block text-xs text-muted-foreground">{i.unitCode}</span>}
        </span>
      ),
    },
    { key: "type", header: dict.common.type, sortable: true, render: (i) => dict.entity.inspectionType[i.type as keyof typeof dict.entity.inspectionType] ?? i.type },
    { key: "inspector", header: t.inspector, sortable: true, render: (i) => <span className="text-sm text-muted-foreground">{i.inspector ?? "—"}</span> },
    { key: "scheduledFor", header: dict.common.date, sortable: true, render: (i) => <span className="tnum text-muted-foreground">{fmtDate(i.scheduledFor, locale)}</span> },
    {
      key: "complianceScore", header: t.score, sortable: true,
      render: (i) =>
        i.complianceScore != null ? (
          <span className={`tnum font-semibold ${i.complianceScore >= 90 ? "text-emerald-400" : i.complianceScore >= 75 ? "text-[#c5a880]" : "text-rose-400"}`}>
            {num(i.complianceScore)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "findings", header: t.findings, render: (i) => <span className="line-clamp-1 max-w-56 text-xs text-muted-foreground">{i.findings ?? "—"}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (i) => <StatusBadge label={dict.status[i.status as InspectionStatus] ?? i.status} tone={INSPECTION_STATUS_TONE[i.status as InspectionStatus] ?? "neutral"} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={filtered}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={dict.common.searchPlaceholder}
      pageSize={10}
      emptyState={<EmptyState icon={ClipboardCheck} title={t.empty} description={dict.common.noResultsFor} />}
    />
  );
}

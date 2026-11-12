"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { DataTable, SearchInput, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { aed, num } from "@/lib/format";
import { PROTECTION_TONE, UNIT_STATUS_TONE, type ProtectionStatus, type UnitStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { getAvailableUnits } from "@/lib/data/leasing";

type Row = Awaited<ReturnType<typeof getAvailableUnits>>[number];

export function AvailableUnitsView({ units, dict, locale }: { units: Row[]; dict: Dictionary; locale: Locale }) {
  const t = dict.leasing.available;
  const [search, setSearch] = React.useState("");
  const [district, setDistrict] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const districts = React.useMemo(() => Array.from(new Set(units.map((u) => u.district))), [units]);

  const filtered = units.filter((u) => {
    if (district !== "all" && u.district !== district) return false;
    if (status !== "all" && u.status !== status) return false;
    const q = search.toLowerCase();
    return !q || u.code.toLowerCase().includes(q) || u.property.toLowerCase().includes(q);
  });

  const columns: Column<Row>[] = [
    {
      key: "code", header: dict.landlord.units.unit, sortable: true,
      render: (u) => (
        <span>
          <span className="tnum block font-semibold text-foreground">{u.code}</span>
          <span className="block text-xs text-muted-foreground">{u.property} · {locale === "ar" && u.districtAr ? u.districtAr : u.district}</span>
        </span>
      ),
    },
    { key: "type", header: dict.common.type, sortable: true, render: (u) => dict.entity.unitType[u.type as keyof typeof dict.entity.unitType] ?? u.type },
    { key: "sizeSqm", header: dict.landlord.units.size, sortable: true, render: (u) => <span className="tnum text-muted-foreground">{num(u.sizeSqm)} m²</span> },
    { key: "rentAed", header: t.asking, sortable: true, render: (u) => <span className="tnum font-semibold text-[#c5a880]">{aed(u.rentAed)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (u) => <StatusBadge label={dict.status[u.status as UnitStatus]} tone={UNIT_STATUS_TONE[u.status as UnitStatus]} /> },
    { key: "protectionStatus", header: dict.nav.protection, sortable: true, render: (u) => <StatusBadge label={dict.status[u.protectionStatus as ProtectionStatus]} tone={PROTECTION_TONE[u.protectionStatus as ProtectionStatus]} /> },
    { key: "floor", header: dict.landlord.units.floor, sortable: true, render: (u) => <span className="tnum text-muted-foreground">{num(u.floor)}</span> },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder={dict.common.searchPlaceholder} className="w-full sm:w-64" />
        <FilterSelect value={district} onChange={setDistrict} ariaLabel={dict.landlord.units.district}
          options={[{ value: "all", label: dict.common.all }, ...districts.map((d) => ({ value: d, label: d }))]} />
        <FilterSelect value={status} onChange={setStatus} ariaLabel={dict.common.status}
          options={[{ value: "all", label: t.availableFrom }, ...(["vacant", "under_notice"] as const).map((s) => ({ value: s, label: dict.status[s] }))]} />
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={Building2} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

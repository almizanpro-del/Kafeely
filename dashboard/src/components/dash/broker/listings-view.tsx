"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { aed, num } from "@/lib/format";
import { PROTECTION_TONE, UNIT_STATUS_TONE, type ProtectionStatus, type UnitStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { BrokerListingRow } from "@/lib/data/broker";

export function ListingsView({ rows, dict, locale }: { rows: BrokerListingRow[]; dict: Dictionary; locale: Locale }) {
  const t = dict.broker.listingsBroker;
  const [search, setSearch] = React.useState("");
  const [district, setDistrict] = React.useState("all");
  const districts = React.useMemo(() => Array.from(new Set(rows.map((r) => r.district))), [rows]);

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (district !== "all" && r.district !== district) return false;
        const q = search.toLowerCase();
        return !q || r.code.toLowerCase().includes(q) || r.property.toLowerCase().includes(q);
      }),
    [rows, search, district]
  );

  const columns: Column<BrokerListingRow>[] = [
    {
      key: "code", header: dict.landlord.units.unit, sortable: true,
      render: (r) => (
        <span>
          <span className="tnum block font-semibold text-foreground">{r.code}</span>
          <span className="block text-xs text-muted-foreground">{r.property}</span>
        </span>
      ),
    },
    { key: "district", header: dict.landlord.units.district, sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{r.district}</span> },
    { key: "type", header: dict.common.type, sortable: true, render: (r) => dict.entity.unitType[r.type as keyof typeof dict.entity.unitType] ?? r.type },
    { key: "rentAed", header: t.rent, sortable: true, render: (r) => <span className="tnum font-medium">{aed(r.rentAed)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (r) => <StatusBadge label={dict.status[r.status as UnitStatus]} tone={UNIT_STATUS_TONE[r.status as UnitStatus]} /> },
    { key: "protectionStatus", header: t.protection, sortable: true, render: (r) => <StatusBadge label={dict.status[r.protectionStatus as ProtectionStatus]} tone={PROTECTION_TONE[r.protectionStatus as ProtectionStatus]} /> },
    { key: "enquiries", header: t.performance, sortable: true, render: (r) => <span className="tnum font-semibold text-[#c5a880]">{num(r.enquiries)}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={filtered}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={dict.common.searchPlaceholder}
      filters={[{ value: district, onChange: setDistrict, ariaLabel: dict.landlord.units.district, options: [{ value: "all", label: dict.common.all }, ...districts.map((d) => ({ value: d, label: d }))] }]}
      pageSize={10}
      emptyState={<EmptyState icon={Building2} title={t.empty} description={dict.common.noResultsFor} />}
    />
  );
}

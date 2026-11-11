"use client";

import * as React from "react";
import { Truck, Star } from "lucide-react";
import { DataTable, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { num } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Vendor = { id: string; name: string; category: string; contactName: string | null; phone: string | null; rating: number; jobsCompleted: number; status: string };

export function VendorsView({ vendors, dict, locale }: { vendors: Vendor[]; dict: Dictionary; locale: Locale }) {
  const t = dict.facility.vendors;
  const [category, setCategory] = React.useState("all");
  const categories = React.useMemo(() => Array.from(new Set(vendors.map((v) => v.category))), [vendors]);

  const filtered = vendors.filter((v) => category === "all" || v.category === category);

  const columns: Column<Vendor>[] = [
    {
      key: "name", header: dict.common.name, sortable: true,
      render: (v) => (
        <span>
          <span className="block font-medium text-foreground">{v.name}</span>
          <span className="block text-xs text-muted-foreground">{v.contactName} · <span className="tnum">{v.phone}</span></span>
        </span>
      ),
    },
    { key: "category", header: t.category, sortable: true, render: (v) => dict.entity.ticketCategory[v.category as keyof typeof dict.entity.ticketCategory] ?? v.category },
    {
      key: "rating", header: t.rating, sortable: true,
      render: (v) => (
        <span className="flex items-center gap-1.5">
          <Star className="size-3.5 fill-[#c5a880] text-[#c5a880]" aria-hidden />
          <span className="tnum font-semibold text-foreground">{v.rating.toFixed(1)}</span>
        </span>
      ),
    },
    { key: "jobsCompleted", header: t.jobs, sortable: true, render: (v) => <span className="tnum text-muted-foreground">{num(v.jobsCompleted)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (v) => <StatusBadge label={dict.status.active} tone="success" /> },
  ];

  return (
    <>
      <div className="mb-4">
        <FilterSelect value={category} onChange={setCategory} ariaLabel={t.category}
          options={[{ value: "all", label: dict.common.all }, ...categories.map((c) => ({ value: c, label: dict.entity.ticketCategory[c as keyof typeof dict.entity.ticketCategory] ?? c }))]} />
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={Truck} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { DataTable, SearchInput, FilterSelect, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDate } from "@/lib/format";
import { LEAD_STAGE_TONE, type LeadStage } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type ClientRow = { id: string; name: string; type: string; stage: LeadStage; phone: string | null; email: string | null; since: string; budgetAed: number | null };

export function ClientsView({ rows, dict, locale }: { rows: ClientRow[]; dict: Dictionary; locale: Locale }) {
  const t = dict.broker.clients;
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("all");

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (type !== "all" && r.type !== type) return false;
        const q = search.toLowerCase();
        return !q || r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q);
      }),
    [rows, search, type]
  );

  const columns: Column<ClientRow>[] = [
    {
      key: "name", header: t.client, sortable: true,
      render: (c) => (
        <span>
          <span className="block font-medium text-foreground">{c.name}</span>
          <span className="block text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</span>
        </span>
      ),
    },
    { key: "type", header: t.clientType, sortable: true, render: (c) => dict.entity.leadClientType[c.type as keyof typeof dict.entity.leadClientType] ?? c.type },
    { key: "stage", header: dict.agent.clientsAgent.stage, sortable: true, render: (c) => <StatusBadge label={dict.status[c.stage]} tone={LEAD_STAGE_TONE[c.stage]} /> },
    { key: "budgetAed", header: dict.agent.clientsAgent.budget, sortable: true, render: (c) => (c.budgetAed ? <span className="tnum">{c.budgetAed.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>) },
    { key: "since", header: t.since, sortable: true, render: (c) => <span className="tnum text-xs text-muted-foreground">{fmtDate(c.since, locale)}</span> },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder={dict.common.searchPlaceholder} className="w-full sm:w-64" />
        <FilterSelect value={type} onChange={setType} ariaLabel={t.clientType}
          options={[{ value: "all", label: dict.common.all }, ...Object.entries(dict.entity.leadClientType).map(([v, l]) => ({ value: v, label: l }))]} />
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={Users} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

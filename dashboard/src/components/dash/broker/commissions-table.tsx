"use client";

import * as React from "react";
import { BadgeDollarSign } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { aed, fmtDate } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Row = { id: string; dealRef: string; clientName: string; amountAed: number; ratePct: number; status: string; closedAt: string | null; paidAt: string | null };

const TONE: Record<string, "success" | "info" | "warning"> = { paid: "success", approved: "info", pending: "warning" };

export function CommissionsTable({ rows, dict, locale }: { rows: Row[]; dict: Dictionary; locale: Locale }) {
  const [search, setSearch] = React.useState("");

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.dealRef.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q);
  });

  const columns: Column<Row>[] = [
    {
      key: "dealRef", header: dict.broker.commissions.deal, sortable: true,
      render: (r) => (
        <span>
          <span className="tnum block font-semibold text-foreground">{r.dealRef}</span>
          <span className="block text-xs text-muted-foreground">{r.clientName}</span>
        </span>
      ),
    },
    { key: "ratePct", header: dict.broker.commissions.rate, sortable: true, render: (r) => <span className="tnum text-muted-foreground">{r.ratePct}%</span> },
    { key: "amountAed", header: dict.broker.commissions.earned, sortable: true, render: (r) => <span className="tnum font-semibold text-[#c5a880]">{aed(r.amountAed)}</span> },
    { key: "closedAt", header: dict.common.date, sortable: true, render: (r) => <span className="tnum text-xs text-muted-foreground">{r.closedAt ? fmtDate(r.closedAt, locale) : "—"}</span> },
    { key: "paidAt", header: dict.broker.commissions.paidOut, render: (r) => <span className="tnum text-xs text-muted-foreground">{r.paidAt ? fmtDate(r.paidAt, locale) : "—"}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (r) => <StatusBadge label={dict.status[r.status as "paid"] ?? r.status} tone={TONE[r.status] ?? "neutral"} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={filtered}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={dict.common.searchPlaceholder}
      pageSize={10}
      emptyState={<EmptyState icon={BadgeDollarSign} title={dict.broker.commissions.empty} description={dict.common.noResultsFor} />}
    />
  );
}

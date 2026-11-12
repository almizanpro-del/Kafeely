"use client";

import * as React from "react";
import { toast } from "sonner";
import { ScrollText, Download } from "lucide-react";
import { DataTable, SearchInput, FilterSelect, downloadCsv, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { ROLES } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Row = { id: string; actorName: string; actorRole: string; action: string; entityType: string; entityId: string | null; detail: string | null; ip: string | null; createdAt: string };

const ACTION_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  login: "info", approve: "success", verify: "success", suspend: "danger", erase: "danger",
  role_change: "warning", reset_password: "warning", export: "neutral", status: "info", update: "info",
};

export function AuditView({ rows, dict, locale }: { rows: Row[]; dict: Dictionary; locale: Locale }) {
  const t = dict.admin.audit;
  const [search, setSearch] = React.useState("");
  const [action, setAction] = React.useState("all");
  const [role, setRole] = React.useState("all");

  const actions = React.useMemo(() => Array.from(new Set(rows.map((r) => r.action.split(".")[0]))), [rows]);

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (action !== "all" && !r.action.startsWith(action)) return false;
        if (role !== "all" && r.actorRole !== role) return false;
        const q = search.toLowerCase();
        return !q || [r.actorName, r.action, r.detail ?? "", r.entityType].some((v) => v.toLowerCase().includes(q));
      }),
    [rows, search, action, role]
  );

  const columns: Column<Row>[] = [
    { key: "createdAt", header: dict.common.date, sortable: true, render: (r) => <span className="tnum whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.createdAt, locale)}</span> },
    {
      key: "actorName", header: t.actor, sortable: true,
      render: (r) => (
        <span>
          <span className="block font-medium text-foreground">{r.actorName}</span>
          <span className="block text-xs text-muted-foreground">{dict.role[r.actorRole as keyof typeof dict.role]?.label ?? r.actorRole}</span>
        </span>
      ),
    },
    { key: "action", header: t.action, sortable: true, render: (r) => <StatusBadge label={r.action} tone={ACTION_TONE[r.action.split(".")[1]] ?? "neutral"} dot={false} /> },
    {
      key: "entityType", header: t.entity, sortable: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.entityType}{r.entityId ? <span className="tnum"> · {r.entityId.slice(0, 12)}</span> : null}</span>,
    },
    { key: "detail", header: t.detail, render: (r) => <span className="line-clamp-1 max-w-md text-xs text-muted-foreground">{r.detail ?? "—"}</span> },
    { key: "ip", header: t.ip, render: (r) => <span className="tnum text-xs text-muted-foreground">{r.ip ?? "—"}</span> },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder={dict.common.searchPlaceholder} className="w-full sm:w-64" />
        <FilterSelect value={action} onChange={setAction} ariaLabel={t.action}
          options={[{ value: "all", label: t.filterAction }, ...actions.map((a) => ({ value: a, label: a }))]} />
        <FilterSelect value={role} onChange={setRole} ariaLabel={t.actor}
          options={[{ value: "all", label: t.filterRole }, ...ROLES.map((r) => ({ value: r, label: dict.role[r].label }))]} />
        <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCsv(filtered, columns, "kafeely-audit.csv"); toast.success(dict.toast.exported); }}>
          <Download className="size-4" aria-hidden />
          {dict.common.export}
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={12}
        emptyState={<EmptyState icon={ScrollText} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

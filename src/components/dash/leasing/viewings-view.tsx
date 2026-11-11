"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Check, X } from "lucide-react";
import { DataTable, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { fmtDateTime } from "@/lib/format";
import { VIEWING_STATUS_TONE, type ViewingStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { ViewingRow } from "@/lib/data/leasing";

export function ViewingsView({ rows, dict, locale }: { rows: ViewingRow[]; dict: Dictionary; locale: Locale }) {
  const t = dict.leasing.viewings;
  const router = useRouter();
  const [status, setStatus] = React.useState("all");

  const act = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/viewings/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      toast.success(dict.toast.actionConfirmed);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = rows.filter((r) => status === "all" || r.status === status);

  const columns: Column<ViewingRow>[] = [
    {
      key: "leadName", header: t.lead, sortable: true,
      render: (v) => (
        <span>
          <span className="block font-medium text-foreground">{v.leadName}</span>
          <span className="tnum block text-xs text-muted-foreground">{v.phone ?? "—"}</span>
        </span>
      ),
    },
    {
      key: "unitCode", header: dict.landlord.units.unit, sortable: true,
      render: (v) => (
        <span>
          <span className="tnum block text-foreground">{v.unitCode}</span>
          <span className="block text-xs text-muted-foreground">{v.property}</span>
        </span>
      ),
    },
    { key: "agentName", header: t.agent, sortable: true, render: (v) => <span className="text-muted-foreground">{v.agentName ?? "—"}</span> },
    { key: "scheduledAt", header: t.when, sortable: true, render: (v) => <span className="tnum text-sm text-[#c5a880]">{fmtDateTime(v.scheduledAt, locale)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (v) => <StatusBadge label={dict.status[v.status as ViewingStatus] ?? v.status} tone={VIEWING_STATUS_TONE[v.status as ViewingStatus] ?? "neutral"} /> },
    {
      key: "actions", header: dict.common.actions, sortable: false,
      render: (v) =>
        v.status === "scheduled" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" disabled={act.isPending} className="h-7 gap-1 border-emerald-500/30 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10" onClick={() => act.mutate({ id: v.id, status: "completed" })}>
              <Check className="size-3" aria-hidden /> {t.markCompleted}
            </Button>
            <Button size="sm" variant="outline" disabled={act.isPending} className="h-7 gap-1 border-rose-500/30 px-2 text-xs text-rose-300 hover:bg-rose-500/10" onClick={() => act.mutate({ id: v.id, status: "no_show" })}>
              <X className="size-3" aria-hidden /> {t.markNoShow}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-4">
        <FilterSelect value={status} onChange={setStatus} ariaLabel={dict.common.status}
          options={[{ value: "all", label: dict.common.all }, ...(["scheduled", "completed", "no_show", "cancelled"] as const).map((s) => ({ value: s, label: dict.status[s] }))]} />
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={CalendarClock} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

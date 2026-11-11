"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { DataTable, SearchInput, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { aed, fmtDate } from "@/lib/format";
import { CLAIM_STATUS_TONE, PRIORITY_TONE, type ClaimStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Row = { id: string; ref: string; unitCode: string; property: string; type: string; status: ClaimStatus; amountAed: number; priority: string; raisedBy: string; createdAt: string; description: string };

const NEXT_ACTIONS: Partial<Record<ClaimStatus, { action: ClaimStatus; labelKey: "review" | "approveClaim" | "reject" | "settle" }[]>> = {
  submitted: [{ action: "under_review", labelKey: "review" }, { action: "rejected", labelKey: "reject" }],
  under_review: [{ action: "approved", labelKey: "approveClaim" }, { action: "rejected", labelKey: "reject" }],
  approved: [{ action: "settled", labelKey: "settle" }],
};

export function AdminClaimsView({ rows, dict, locale }: { rows: Row[]; dict: Dictionary; locale: Locale }) {
  const t = dict.admin.claimsAdmin;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const act = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api("/api/claims", { method: "PATCH", body: { id, status } }),
    onSuccess: () => {
      toast.success(dict.toast.claimUpdated);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        const q = search.toLowerCase();
        return !q || r.ref.toLowerCase().includes(q) || r.unitCode.toLowerCase().includes(q) || r.raisedBy.toLowerCase().includes(q);
      }),
    [rows, search, status]
  );

  const columns: Column<Row>[] = [
    { key: "ref", header: t.unit === "" ? "Ref" : dict.landlord.claims.ref, sortable: true, render: (c) => <span className="tnum font-semibold text-[#c5a880]">{c.ref}</span> },
    { key: "unitCode", header: t.unit, sortable: true, render: (c) => <span><span className="tnum text-foreground">{c.unitCode}</span><span className="block text-xs text-muted-foreground">{c.property}</span></span> },
    { key: "type", header: dict.common.type, sortable: true, render: (c) => dict.entity.claimType[c.type as keyof typeof dict.entity.claimType] ?? c.type },
    { key: "raisedBy", header: t.raisedBy, sortable: true, render: (c) => <span className="text-foreground">{c.raisedBy}</span> },
    { key: "amountAed", header: dict.common.amount, sortable: true, render: (c) => <span className="tnum font-medium">{aed(c.amountAed)}</span> },
    { key: "priority", header: dict.common.priority, sortable: true, render: (c) => <StatusBadge label={dict.status[c.priority as "low"] ?? c.priority} tone={PRIORITY_TONE[c.priority as "low"] ?? "neutral"} dot={false} /> },
    { key: "status", header: dict.common.status, sortable: true, render: (c) => <StatusBadge label={dict.status[c.status]} tone={CLAIM_STATUS_TONE[c.status]} /> },
    { key: "createdAt", header: dict.landlord.claims.filed, sortable: true, render: (c) => <span className="tnum text-xs text-muted-foreground">{fmtDate(c.createdAt, locale)}</span> },
    {
      key: "actions", header: dict.common.actions, sortable: false,
      render: (c) => (
        <div className="flex flex-wrap gap-1.5">
          {(NEXT_ACTIONS[c.status] ?? []).map((a) => (
            <Button
              key={a.action}
              size="sm" variant="outline"
              disabled={act.isPending}
              className={
                a.action === "approved" ? "h-7 gap-1 border-emerald-500/30 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                : a.action === "rejected" ? "h-7 gap-1 border-rose-500/30 px-2 text-xs text-rose-300 hover:bg-rose-500/10"
                : "h-7 gap-1 border-[#c5a880]/40 px-2 text-xs text-[#dcc39a] hover:bg-[#c5a880]/10"
              }
              onClick={() => act.mutate({ id: c.id, status: a.action })}
            >
              {t[a.labelKey]}
            </Button>
          ))}
          {!(c.status in NEXT_ACTIONS) && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder={dict.common.searchPlaceholder} className="w-full sm:w-64" />
        <FilterSelect value={status} onChange={setStatus} ariaLabel={dict.common.status}
          options={[{ value: "all", label: dict.common.all }, ...(["submitted", "under_review", "approved", "rejected", "settled"] as const).map((s) => ({ value: s, label: dict.status[s] }))]} />
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={ShieldAlert} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, Check, Repeat2, X } from "lucide-react";
import { DataTable, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { aed, fmtDate } from "@/lib/format";
import { OFFER_STATUS_TONE, type OfferStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Row = {
  id: string; unitCode: string; property: string; fromType: string; fromName: string;
  amountAed: number; terms: string | null; status: OfferStatus; createdAt: string;
};

const NEXT: Partial<Record<OfferStatus, { action: OfferStatus; labelKey: "accept" | "counter" | "decline" }[]>> = {
  pending: [{ action: "accepted", labelKey: "accept" }, { action: "countered", labelKey: "counter" }, { action: "declined", labelKey: "decline" }],
  countered: [{ action: "accepted", labelKey: "accept" }, { action: "declined", labelKey: "decline" }],
};

export function OffersView({ rows, dict, locale }: { rows: Row[]; dict: Dictionary; locale: Locale }) {
  const t = dict.leasing.offersLeasing;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const act = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/offers/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      toast.success(dict.toast.offerUpdated);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    const q = search.toLowerCase();
    return !q || r.unitCode.toLowerCase().includes(q) || r.fromName.toLowerCase().includes(q) || r.property.toLowerCase().includes(q);
  });

  const columns: Column<Row>[] = [
    {
      key: "unitCode", header: t.unit, sortable: true,
      render: (r) => (
        <span>
          <span className="tnum block font-semibold text-foreground">{r.unitCode}</span>
          <span className="block text-xs text-muted-foreground">{r.property}</span>
        </span>
      ),
    },
    {
      key: "fromName", header: t.from, sortable: true,
      render: (r) => (
        <span>
          <span className="block text-foreground">{r.fromName}</span>
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{r.fromType}</span>
        </span>
      ),
    },
    { key: "amountAed", header: t.offered, sortable: true, render: (r) => <span className="tnum font-semibold text-[#c5a880]">{aed(r.amountAed)}</span> },
    { key: "terms", header: dict.common.details, render: (r) => <span className="line-clamp-1 max-w-48 text-xs italic text-muted-foreground">{r.terms ?? "—"}</span> },
    { key: "createdAt", header: dict.agent.offersAgent.submitted, sortable: true, render: (r) => <span className="tnum text-xs text-muted-foreground">{fmtDate(r.createdAt, locale)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (r) => <StatusBadge label={dict.status[r.status]} tone={OFFER_STATUS_TONE[r.status]} /> },
    {
      key: "actions", header: dict.common.actions, sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {(NEXT[r.status] ?? []).map((a) => (
            <Button
              key={a.action} size="sm" variant="outline" disabled={act.isPending}
              className={
                a.action === "accepted" ? "h-7 gap-1 border-emerald-500/30 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                : a.action === "declined" ? "h-7 gap-1 border-rose-500/30 px-2 text-xs text-rose-300 hover:bg-rose-500/10"
                : "h-7 gap-1 border-[#c5a880]/40 px-2 text-xs text-[#dcc39a] hover:bg-[#c5a880]/10"
              }
              onClick={() => act.mutate({ id: r.id, status: a.action })}
            >
              {a.action === "accepted" ? <Check className="size-3" aria-hidden /> : a.action === "declined" ? <X className="size-3" aria-hidden /> : <Repeat2 className="size-3" aria-hidden />}
              {t[a.labelKey]}
            </Button>
          ))}
          {!(r.status in NEXT) && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.common.searchPlaceholder}
          aria-label={dict.common.search}
          className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none transition focus:border-ring sm:w-64"
        />
        <FilterSelect value={status} onChange={setStatus} ariaLabel={dict.common.status}
          options={[{ value: "all", label: dict.common.all }, ...(["pending", "countered", "accepted", "declined"] as const).map((s) => ({ value: s, label: dict.status[s] }))]} />
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={Handshake} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

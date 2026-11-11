"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Inbox, Check, X, Search } from "lucide-react";
import { DataTable, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { aed, fmtDate, num } from "@/lib/format";
import { APPLICATION_STATUS_TONE, type ApplicationStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { ApplicationRow } from "@/lib/data/leasing";

const NEXT: Partial<Record<ApplicationStatus, { action: ApplicationStatus; labelKey: "startScreening" | "approveApp" | "rejectApp" }[]>> = {
  new: [{ action: "screening", labelKey: "startScreening" }],
  screening: [{ action: "approved", labelKey: "approveApp" }, { action: "rejected", labelKey: "rejectApp" }],
};

export function ApplicationsView({ applications, dict, locale }: { applications: ApplicationRow[]; dict: Dictionary; locale: Locale }) {
  const t = dict.leasing.applications;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const act = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/applications/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      toast.success(dict.toast.applicationUpdated);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = applications.filter((a) => {
    if (status !== "all" && a.status !== status) return false;
    const q = search.toLowerCase();
    return !q || a.ref.toLowerCase().includes(q) || a.applicantName.toLowerCase().includes(q) || a.unitCode.toLowerCase().includes(q);
  });

  const columns: Column<ApplicationRow>[] = [
    {
      key: "applicantName", header: t.applicant, sortable: true,
      render: (a) => (
        <span>
          <span className="block font-medium text-foreground">{a.applicantName}</span>
          <span className="tnum block text-xs text-muted-foreground">{a.email ?? a.phone ?? a.ref}</span>
        </span>
      ),
    },
    {
      key: "unitCode", header: dict.leasing.offersLeasing.unit, sortable: true,
      render: (a) => (
        <span>
          <span className="tnum block text-foreground">{a.unitCode}</span>
          <span className="block text-xs text-muted-foreground">{a.property}</span>
        </span>
      ),
    },
    { key: "nationality", header: t.nationality, sortable: true, render: (a) => <span className="text-muted-foreground">{a.nationality ?? "—"}</span> },
    { key: "monthlyIncomeAed", header: t.income, sortable: true, render: (a) => (a.monthlyIncomeAed ? <span className="tnum">{aed(a.monthlyIncomeAed, { compact: true })}</span> : <span className="text-muted-foreground">—</span>) },
    {
      key: "score", header: t.score, sortable: true,
      render: (a) =>
        a.score != null ? (
          <span className={`tnum font-semibold ${a.score >= 85 ? "text-emerald-400" : a.score >= 70 ? "text-[#c5a880]" : "text-rose-400"}`}>
            {num(a.score)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "submittedAt", header: dict.common.date, sortable: true, render: (a) => <span className="tnum text-xs text-muted-foreground">{fmtDate(a.submittedAt, locale)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (a) => <StatusBadge label={dict.status[a.status as ApplicationStatus] ?? a.status} tone={APPLICATION_STATUS_TONE[a.status as ApplicationStatus] ?? "neutral"} /> },
    {
      key: "actions", header: dict.common.actions, sortable: false,
      render: (a) => (
        <div className="flex flex-wrap gap-1.5">
          {(NEXT[a.status as ApplicationStatus] ?? []).map((n) => (
            <Button
              key={n.action} size="sm" variant="outline" disabled={act.isPending}
              className={
                n.action === "approved" ? "h-7 gap-1 border-emerald-500/30 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                : n.action === "rejected" ? "h-7 gap-1 border-rose-500/30 px-2 text-xs text-rose-300 hover:bg-rose-500/10"
                : "h-7 gap-1 border-[#c5a880]/40 px-2 text-xs text-[#dcc39a] hover:bg-[#c5a880]/10"
              }
              onClick={() => act.mutate({ id: a.id, status: n.action })}
            >
              {n.action === "approved" ? <Check className="size-3" aria-hidden /> : n.action === "rejected" ? <X className="size-3" aria-hidden /> : <Search className="size-3" aria-hidden />}
              {t[n.labelKey]}
            </Button>
          ))}
          {!(a.status in NEXT) && <span className="text-xs text-muted-foreground">—</span>}
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
          options={[{ value: "all", label: dict.common.all }, ...(["new", "screening", "approved", "rejected"] as const).map((s) => ({ value: s, label: dict.status[s] }))]} />
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={Inbox} title={t.empty} description={dict.common.noResultsFor} />}
      />
    </>
  );
}

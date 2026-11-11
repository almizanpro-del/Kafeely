"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Inbox, ShieldCheck, CheckCircle2, Eraser } from "lucide-react";
import { DataTable, downloadCsv, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { fmtDate } from "@/lib/format";
import { WAITLIST_STATUS_TONE, type WaitlistStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Row = { id: string; fullName: string; email: string; phone: string | null; audience: string; source: string; status: WaitlistStatus; createdAt: string };

export function WaitlistView({ rows, dict, locale }: { rows: Row[]; dict: Dictionary; locale: Locale }) {
  const t = dict.admin.waitlist;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [audience, setAudience] = React.useState("all");
  const [eraseTarget, setEraseTarget] = React.useState<Row | null>(null);

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api(`/api/waitlist/${id}`, { method: "PATCH", body: { action } }),
    onSuccess: (_d, v) => {
      toast.success(
        v.action === "verify" ? dict.toast.waitlistVerified : v.action === "convert" ? dict.toast.waitlistConverted : dict.toast.waitlistErased
      );
      setEraseTarget(null);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (audience !== "all" && r.audience !== audience) return false;
        const q = search.toLowerCase();
        return !q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      }),
    [rows, search, status, audience]
  );

  const columns: Column<Row>[] = [
    {
      key: "fullName", header: dict.common.name, sortable: true,
      render: (r) => (
        <span>
          <span className={`block font-medium ${r.status === "erased" ? "text-muted-foreground line-through" : "text-foreground"}`}>{r.fullName}</span>
          <span className="block text-xs text-muted-foreground">{r.email}</span>
        </span>
      ),
    },
    { key: "phone", header: dict.common.phone, render: (r) => <span className="tnum text-muted-foreground">{r.phone ?? "—"}</span> },
    { key: "audience", header: t.audience, sortable: true, render: (r) => <span className="capitalize text-foreground">{r.audience}</span> },
    { key: "source", header: t.source, sortable: true, render: (r) => <span className="capitalize text-muted-foreground">{r.source}</span> },
    { key: "createdAt", header: t.joined, sortable: true, render: (r) => <span className="tnum text-xs text-muted-foreground">{fmtDate(r.createdAt, locale)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (r) => <StatusBadge label={dict.status[r.status]} tone={WAITLIST_STATUS_TONE[r.status]} /> },
    {
      key: "actions", header: dict.common.actions, sortable: false, className: "min-w-[240px]",
      render: (r) =>
        r.status === "erased" ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            {r.status === "new" && (
              <Button size="sm" variant="outline" className="h-7 gap-1 border-emerald-500/30 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10" disabled={act.isPending}
                onClick={() => act.mutate({ id: r.id, action: "verify" })}>
                <ShieldCheck className="size-3" aria-hidden /> {t.verify}
              </Button>
            )}
            {r.status !== "converted" && (
              <Button size="sm" variant="outline" className="h-7 gap-1 border-[#c5a880]/40 px-2 text-xs text-[#dcc39a] hover:bg-[#c5a880]/10" disabled={act.isPending}
                onClick={() => act.mutate({ id: r.id, action: "convert" })}>
                <CheckCircle2 className="size-3" aria-hidden /> {t.convert}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 gap-1 border-rose-500/30 px-2 text-xs text-rose-300 hover:bg-rose-500/10" disabled={act.isPending}
              onClick={() => setEraseTarget(r)}>
              <Eraser className="size-3" aria-hidden /> {t.erase}
            </Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={filtered}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t.searchPlaceholder}
        filters={[
          { value: status, onChange: setStatus, ariaLabel: dict.common.status, options: [{ value: "all", label: dict.common.all }, ...(["new", "contacted", "qualified", "converted", "erased"] as const).map((s) => ({ value: s, label: dict.status[s] }))] },
          { value: audience, onChange: setAudience, ariaLabel: t.audience, options: [{ value: "all", label: dict.common.all }, ...["owner", "tenant", "partner", "investor"].map((a) => ({ value: a, label: a }))] },
        ]}
        onExport={() => { downloadCsv(filtered, columns, "kafeely-waitlist.csv"); toast.success(dict.toast.exported); }}
        pageSize={10}
        emptyState={<EmptyState icon={Inbox} title={t.empty} description={t.emptyDesc} />}
      />

      <ConfirmDialog
        open={!!eraseTarget}
        onOpenChange={(v) => !v && setEraseTarget(null)}
        title={t.erase}
        body={t.eraseConfirm}
        destructive
        confirmLabel={dict.confirm.confirmLabel}
        cancelLabel={dict.common.cancel}
        onConfirm={() => eraseTarget && act.mutate({ id: eraseTarget.id, action: "erase" })}
      />
    </>
  );
}

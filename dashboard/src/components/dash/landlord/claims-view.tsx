"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { aed, fmtDate } from "@/lib/format";
import { CLAIM_STATUS_TONE, PRIORITY_TONE, type ClaimStatus, type ClaimRow } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { LandlordUnitRow } from "@/lib/data/landlord";

const STATUS_FLOW: ClaimStatus[] = ["submitted", "under_review", "approved", "settled", "rejected"];

export function LandlordClaimsView({
  claims, units, dict, locale,
}: {
  claims: ClaimRow[];
  units: LandlordUnitRow[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.landlord.claims;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<ClaimRow | null>(null);

  // form state
  const [unitId, setUnitId] = React.useState(units[0]?.id ?? "");
  const [claimType, setClaimType] = React.useState("damage");
  const [amount, setAmount] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [description, setDescription] = React.useState("");

  const createClaim = useMutation({
    mutationFn: () =>
      api<{ claim: { ref: string } }>("/api/claims", {
        body: { unitId, type: claimType, amountAed: Number(amount) || 0, priority, description },
      }),
    onSuccess: (data) => {
      toast.success(t.claimSubmitted.replace("{ref}", data.claim.ref));
      setOpen(false);
      setDescription("");
      setAmount("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = React.useMemo(
    () =>
      claims.filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (type !== "all" && c.type !== type) return false;
        const q = search.toLowerCase();
        return !q || [c.ref, c.unitCode, c.property, c.description].some((v) => v.toLowerCase().includes(q));
      }),
    [claims, search, status, type]
  );

  const columns: Column<ClaimRow>[] = [
    { key: "ref", header: t.ref, sortable: true, render: (c) => <span className="tnum font-semibold text-[#c5a880]">{c.ref}</span> },
    {
      key: "unitCode", header: t.unit, sortable: true,
      render: (c) => <span><span className="tnum text-foreground">{c.unitCode}</span><span className="block text-xs text-muted-foreground">{c.property}</span></span>,
    },
    { key: "type", header: dict.common.type, sortable: true, render: (c) => dict.entity.claimType[c.type] },
    { key: "amountAed", header: dict.common.amount, sortable: true, render: (c) => <span className="tnum font-medium">{aed(c.amountAed)}</span> },
    { key: "priority", header: dict.common.priority, sortable: true, render: (c) => <StatusBadge label={dict.status[c.priority]} tone={PRIORITY_TONE[c.priority]} dot={false} /> },
    { key: "status", header: dict.common.status, sortable: true, render: (c) => <StatusBadge label={dict.status[c.status]} tone={CLAIM_STATUS_TONE[c.status]} /> },
    { key: "createdAt", header: t.filed, sortable: true, render: (c) => <span className="tnum text-xs text-muted-foreground">{fmtDate(c.createdAt, locale)}</span> },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={filtered}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={dict.common.searchPlaceholder}
        filters={[
          { value: status, onChange: setStatus, options: [{ value: "all", label: dict.common.all }, ...STATUS_FLOW.map((s) => ({ value: s, label: dict.status[s] }))], ariaLabel: dict.common.status },
          { value: type, onChange: setType, options: [{ value: "all", label: dict.common.all }, ...Object.entries(dict.entity.claimType).map(([v, l]) => ({ value: v, label: l }))], ariaLabel: dict.common.type },
        ]}
        toolbarExtra={
          <Button size="sm" onClick={() => setOpen(true)} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
            <Plus className="size-4" aria-hidden />
            {t.reportIssue}
          </Button>
        }
        onExport={() => import("@/components/shared/data-table").then((m) => m.downloadCsv(filtered, columns, "kafeely-claims.csv"))}
        onRowClick={(c) => setDetail(c)}
        emptyState={<EmptyState icon={ShieldAlert} title={t.empty} description={t.emptyDesc} />}
      />

      {/* Report issue dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.reportTitle}</DialogTitle>
            <DialogDescription>{t.reportDesc}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createClaim.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="claim-unit" className="text-xs text-muted-foreground">{t.unit}</Label>
                <select
                  id="claim-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id} className="bg-popover">{u.code} — {u.property}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-type" className="text-xs text-muted-foreground">{t.claimType}</Label>
                <select
                  id="claim-type" value={claimType} onChange={(e) => setClaimType(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring"
                >
                  {Object.entries(dict.entity.claimType).map(([v, l]) => (
                    <option key={v} value={v} className="bg-popover">{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-amount" className="text-xs text-muted-foreground">{t.estimatedAmount}</Label>
                <Input id="claim-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary/60" placeholder="15000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-priority" className="text-xs text-muted-foreground">{dict.common.priority}</Label>
                <select
                  id="claim-priority" value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring"
                >
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <option key={p} value={p} className="bg-popover">{dict.status[p]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-desc" className="text-xs text-muted-foreground">{t.description}</Label>
              <Textarea id="claim-desc" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionPlaceholder} className="min-h-24 bg-secondary/60" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border bg-transparent">{dict.common.cancel}</Button>
              <Button type="submit" disabled={createClaim.isPending} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
                {t.submitClaim}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-md border-border bg-popover">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="tnum text-lg text-[#c5a880]">{detail.ref}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={dict.status[detail.status]} tone={CLAIM_STATUS_TONE[detail.status]} />
                  <StatusBadge label={dict.status[detail.priority]} tone={PRIORITY_TONE[detail.priority]} dot={false} />
                </div>
                <p className="text-xs text-muted-foreground">{detail.unitCode} · {detail.property}</p>
                <p className="leading-relaxed text-foreground">{detail.description}</p>
                <p className="tnum text-lg font-semibold text-foreground">{aed(detail.amountAed)}</p>
                <p className="text-xs text-muted-foreground">{t.filed}: {fmtDate(detail.createdAt, locale)}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}

"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser, Download, ShieldCheck, FileCheck2, FileClock } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { fmtDate } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Dsr = { id: string; fullName: string; email: string; kind: "erase" | "export"; createdAt: string };

export function ComplianceView({ dsr, dict, locale }: { dsr: Dsr[]; dict: Dictionary; locale: Locale }) {
  const t = dict.admin.compliance;
  const router = useRouter();
  const [target, setTarget] = React.useState<Dsr | null>(null);
  const [ack, setAck] = React.useState<Record<string, boolean>>({ p1: true, p2: false, p3: true });
  const [retentionAudit, setRetentionAudit] = React.useState(7);
  const [retentionDocs, setRetentionDocs] = React.useState(90);

  const fulfil = useMutation({
    mutationFn: (id: string) => api(`/api/waitlist/${id}`, { method: "PATCH", body: { action: "erase" } }),
    onSuccess: () => {
      toast.success(dict.toast.waitlistErased);
      setTarget(null);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const policies = [
    { key: "p1", label: t.policy1, reviewed: "2026-09-30" },
    { key: "p2", label: t.policy2, reviewed: "2026-08-14" },
    { key: "p3", label: t.policy3, reviewed: "2026-10-21" },
  ];

  return (
    <>
      <PageHeader title={t.title} description={t.desc} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* DSR queue */}
        <SectionCard title={t.dsrQueue} bodyClassName="p-0">
          {dsr.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={ShieldCheck} title={t.dsrEmpty} compact />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {dsr.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{d.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.email} · {fmtDate(d.createdAt, locale)}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <StatusBadge
                      label={d.kind === "erase" ? t.eraseRequests : t.exportRequests}
                      tone={d.kind === "erase" ? "danger" : "info"}
                      dot={false}
                    />
                    {d.kind === "erase" ? (
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-rose-500/30 px-2 text-xs text-rose-300 hover:bg-rose-500/10"
                        onClick={() => setTarget(d)}>
                        <Eraser className="size-3" aria-hidden /> {t.fulfil}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 gap-1 border-border px-2 text-xs" onClick={() => toast.success(dict.toast.exported)}>
                        <Download className="size-3" aria-hidden /> {t.fulfil}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Retention */}
        <SectionCard title={t.retention}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ret-audit" className="text-xs text-muted-foreground">{t.retentionAudit}</Label>
              <Input id="ret-audit" type="number" min={1} max={10} value={retentionAudit} onChange={(e) => setRetentionAudit(Number(e.target.value))} className="tnum bg-secondary/60" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">{t.retentionAuditHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ret-docs" className="text-xs text-muted-foreground">{t.retentionDocs} ({dict.common.demoNote ? "days" : ""})</Label>
              <Input id="ret-docs" type="number" min={30} max={3650} value={retentionDocs} onChange={(e) => setRetentionDocs(Number(e.target.value))} className="tnum bg-secondary/60" />
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-foreground">{t.policies}</p>
            <ul className="space-y-2.5">
              {policies.map((p) => (
                <li key={p.key} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/40 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    {ack[p.key] ? <FileCheck2 className="size-4 shrink-0 text-emerald-400" aria-hidden /> : <FileClock className="size-4 shrink-0 text-amber-300" aria-hidden />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{p.label}</span>
                      <span className="tnum block text-[10px] text-muted-foreground">{t.lastReview}: {fmtDate(p.reviewed, locale)}</span>
                    </span>
                  </span>
                  <Button
                    size="sm" variant={ack[p.key] ? "ghost" : "outline"}
                    className={ack[p.key] ? "h-7 text-xs text-muted-foreground" : "h-7 gap-1 border-[#c5a880]/40 px-2 text-xs text-[#dcc39a]"}
                    onClick={() => { setAck((a) => ({ ...a, [p.key]: true })); toast.success(t.acknowledge); }}
                  >
                    <ShieldCheck className="size-3" aria-hidden />
                    {ack[p.key] ? dict.status.verified : t.acknowledge}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(v) => !v && setTarget(null)}
        title={t.fulfil}
        body={t.fulfilConfirm}
        destructive
        confirmLabel={dict.confirm.confirmLabel}
        cancelLabel={dict.common.cancel}
        onConfirm={() => target && fulfil.mutate(target.id)}
      />
    </>
  );
}

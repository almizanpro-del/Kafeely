"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoveRight, Phone, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { aed } from "@/lib/format";
import { LEAD_STAGE_TONE, type LeadStage } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { LeadRow } from "@/lib/data/broker";
import { cn } from "@/lib/utils";

const STAGES: LeadStage[] = ["new", "contacted", "viewing", "offer", "negotiation", "won", "lost"];

export function PipelineView({ leads, dict }: { leads: LeadRow[]; dict: Dictionary }) {
  const t = dict.broker.pipeline;
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [clientName, setClientName] = React.useState("");
  const [clientType, setClientType] = React.useState("tenant");
  const [interest, setInterest] = React.useState("");
  const [budget, setBudget] = React.useState("");

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => api("/api/leads", { method: "PATCH", body: { id, stage } }),
    onSuccess: (_d, v) => {
      toast.success(t.move + " — " + dict.status[v.stage as LeadStage]);
      qc.invalidateQueries({ queryKey: ["leads"] });
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/api/leads", {
        body: { clientName, clientType, interest, budgetAed: Number(budget) || undefined },
      }),
    onSuccess: () => {
      toast.success(t.addLead);
      setOpen(false);
      setClientName("");
      setInterest("");
      setBudget("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-3">
        <Button size="sm" onClick={() => setOpen(true)} className="shrink-0 bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
          <Plus className="size-4" aria-hidden />
          {t.addLead}
        </Button>
      </div>

      <div className="overflow-x-auto pb-2 thin-scroll">
        <div className="grid min-w-[1080px] grid-cols-7 gap-3">
          {STAGES.map((stage) => {
            const items = leads.filter((l) => l.stage === stage);
            const total = items.reduce((s, l) => s + (l.budgetAed ?? 0), 0);
            return (
              <section key={stage} className="flex min-h-40 flex-col rounded-xl border bg-card/60">
                <header className="border-b border-border/70 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span className={cn("size-1.5 rounded-full", LEAD_STAGE_TONE[stage] === "success" ? "bg-emerald-400" : LEAD_STAGE_TONE[stage] === "danger" ? "bg-rose-400" : "bg-[#c5a880]")} aria-hidden />
                      {dict.status[stage]}
                    </span>
                    <span className="tnum rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{items.length}</span>
                  </div>
                  <p className="tnum mt-1 text-[10px] text-muted-foreground">{total > 0 ? aed(total, { compact: true }) : " "}</p>
                </header>
                <div className="flex-1 space-y-2 p-2">
                  {items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">{t.empty}</p>
                  ) : (
                    items.map((l) => (
                      <DropdownMenu key={l.id}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="w-full rounded-lg border border-border/70 bg-card p-2.5 text-start transition hover:border-[#c5a880]/40 hover:shadow-md"
                            aria-label={l.clientName}
                          >
                            <p className="truncate text-xs font-medium text-foreground">{l.clientName}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{l.interest ?? "—"}</p>
                            {l.budgetAed ? <p className="tnum mt-1 text-[10px] font-semibold text-[#c5a880]">{aed(l.budgetAed, { compact: true })}</p> : null}
                            <span className="mt-1.5 flex items-center gap-2 text-[9px] uppercase tracking-wide text-muted-foreground/70">
                              {dict.entity.leadClientType[l.clientType as keyof typeof dict.entity.leadClientType] ?? l.clientType}
                              · {l.source}
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52 border-border bg-popover">
                          <DropdownMenuLabel className="text-xs">{l.clientName}</DropdownMenuLabel>
                          {l.phone && (
                            <DropdownMenuItem className="gap-2 text-xs"><Phone className="size-3" aria-hidden />{l.phone}</DropdownMenuItem>
                          )}
                          {l.email && (
                            <DropdownMenuItem className="gap-2 text-xs"><Mail className="size-3" aria-hidden />{l.email}</DropdownMenuItem>
                          )}
                          {l.notes && <p className="px-2 py-1.5 text-[10px] italic text-muted-foreground">{l.notes}</p>}
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.move}</DropdownMenuLabel>
                          {STAGES.filter((s) => s !== l.stage).map((s) => (
                            <DropdownMenuItem key={s} className="gap-2 text-xs" disabled={move.isPending}
                              onClick={() => move.mutate({ id: l.id, stage: s })}>
                              <MoveRight className="size-3 rtl:rotate-180" aria-hidden />
                              {dict.status[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.addLead}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="lead-name" className="text-xs text-muted-foreground">{t.leadName}</Label>
              <Input id="lead-name" required value={clientName} onChange={(e) => setClientName(e.target.value)} className="bg-secondary/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-type" className="text-xs text-muted-foreground">{t.clientType}</Label>
                <select id="lead-type" value={clientType} onChange={(e) => setClientType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                  {Object.entries(dict.entity.leadClientType).map(([v, l]) => (
                    <option key={v} value={v} className="bg-popover">{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-budget" className="text-xs text-muted-foreground">{t.budgetAed}</Label>
                <Input id="lead-budget" type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} className="tnum bg-secondary/60" placeholder="180000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-interest" className="text-xs text-muted-foreground">{t.interest}</Label>
              <Input id="lead-interest" value={interest} onChange={(e) => setInterest(e.target.value)} placeholder={t.interestPlaceholder} className="bg-secondary/60" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border bg-transparent">{dict.common.cancel}</Button>
              <Button type="submit" disabled={create.isPending} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">{t.addLead}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

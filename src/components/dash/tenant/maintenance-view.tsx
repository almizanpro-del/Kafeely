"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wrench, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PRIORITY_TONE, TICKET_STATUS_TONE, type Priority, type TicketRow, type TicketStatus } from "@/lib/types";
import type { TenantTicketRow } from "@/lib/data/tenant";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

export function TenantMaintenanceView({
  tickets, unit, propertyId, dict, locale,
}: {
  tickets: TenantTicketRow[];
  unit: { unitId: string; propertyId: string; unitCode: string; property: string } | null;
  propertyId: string;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.tenant.maintenanceTenant;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("hvac");
  const [priority, setPriority] = React.useState("medium");
  const [slot, setSlot] = React.useState("morning");
  const [description, setDescription] = React.useState("");

  const create = useMutation({
    mutationFn: () => {
      const base = new Date();
      base.setDate(base.getDate() + 1);
      const [h] = slot === "morning" ? [9] : slot === "afternoon" ? [13] : [17];
      base.setHours(h, 0, 0, 0);
      return api<{ ticket: { ref: string } }>("/api/tickets", {
        body: {
          unitId: unit?.unitId, propertyId: unit?.propertyId ?? propertyId,
          category, priority, title, description,
          scheduledFor: base.toISOString(),
        },
      });
    },
    onSuccess: (data) => {
      toast.success(t.requestCreated.replace("{ref}", data.ticket.ref));
      setOpen(false);
      setTitle("");
      setDescription("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const columns: Column<TenantTicketRow>[] = [
    {
      key: "title", header: dict.common.name, sortable: true,
      render: (tk) => (
        <span>
          <span className="block font-medium text-foreground">{tk.title}</span>
          <span className="tnum block text-xs text-muted-foreground">{tk.ref} · {tk.unitCode}</span>
        </span>
      ),
    },
    { key: "category", header: t.requestCategory, sortable: true, render: (tk) => dict.entity.ticketCategory[tk.category as keyof typeof dict.entity.ticketCategory] ?? tk.category },
    { key: "priority", header: dict.common.priority, sortable: true, render: (tk) => <StatusBadge label={dict.status[tk.priority as Priority] ?? tk.priority} tone={PRIORITY_TONE[tk.priority as Priority] ?? "neutral"} dot={false} /> },
    { key: "status", header: dict.common.status, sortable: true, render: (tk) => <StatusBadge label={dict.status[tk.status as TicketStatus] ?? tk.status} tone={TICKET_STATUS_TONE[tk.status as TicketStatus] ?? "neutral"} /> },
    { key: "scheduledFor", header: t.scheduledFor, sortable: true, render: (tk) => <span className="tnum text-xs text-muted-foreground">{tk.scheduledFor ? fmtDateTime(tk.scheduledFor, locale) : "—"}</span> },
    { key: "createdAt", header: dict.common.date, sortable: true, render: (tk) => <span className="tnum text-xs text-muted-foreground">{fmtDate(tk.createdAt, locale)}</span> },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={tickets}
        search=""
        pageSize={8}
        toolbarExtra={
          <Button size="sm" onClick={() => setOpen(true)} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
            <Plus className="size-4" aria-hidden />
            {t.newRequest}
          </Button>
        }
        emptyState={<EmptyState icon={Wrench} title={t.empty} description={t.emptyDesc} />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.newRequest}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="tk-title" className="text-xs text-muted-foreground">{t.requestTitle}</Label>
              <Input id="tk-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={dict.tenant.maintenanceTenant.requestDescPlaceholder} className="bg-secondary/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tk-cat" className="text-xs text-muted-foreground">{t.requestCategory}</Label>
                <select id="tk-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                  {Object.entries(dict.entity.ticketCategory).map(([v, l]) => (
                    <option key={v} value={v} className="bg-popover">{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tk-pri" className="text-xs text-muted-foreground">{dict.common.priority}</Label>
                <select id="tk-pri" value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <option key={p} value={p} className="bg-popover">{dict.status[p]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-slot" className="text-xs text-muted-foreground">{t.schedulePref}</Label>
              <select id="tk-slot" value={slot} onChange={(e) => setSlot(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                <option value="morning" className="bg-popover">{t.morning}</option>
                <option value="afternoon" className="bg-popover">{t.afternoon}</option>
                <option value="evening" className="bg-popover">{t.evening}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-desc" className="text-xs text-muted-foreground">{t.requestDesc}</Label>
              <Textarea id="tk-desc" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.requestDescPlaceholder} className="min-h-20 bg-secondary/60" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border bg-transparent">{dict.common.cancel}</Button>
              <Button type="submit" disabled={create.isPending} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">{t.submitRequest}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { TicketRow };

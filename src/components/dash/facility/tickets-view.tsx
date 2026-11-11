"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wrench, Plus, ArrowRight, UserCog } from "lucide-react";
import { DataTable, SearchInput, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { fmtDate } from "@/lib/format";
import { PRIORITY_TONE, TICKET_STATUS_TONE, type Priority, type TicketStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { FmTicketRow } from "@/lib/data/facility";

const FLOW: Record<string, TicketStatus | undefined> = { open: "in_progress", in_progress: "resolved", resolved: "closed" };

export function FmTicketsView({
  tickets, vendors, properties, dict, locale,
}: {
  tickets: FmTicketRow[];
  vendors: { id: string; name: string; category: string }[];
  properties: { id: string; name: string }[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.facility.ticketsFm;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [propertyId, setPropertyId] = React.useState(properties[0]?.id ?? "");
  const [category, setCategory] = React.useState("hvac");
  const [priority, setPriority] = React.useState("medium");
  const [description, setDescription] = React.useState("");

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api("/api/tickets", { method: "PATCH", body: { id, ...body } }),
    onSuccess: () => {
      toast.success(dict.toast.ticketUpdated);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const create = useMutation({
    mutationFn: () => api("/api/tickets", { body: { propertyId, category, priority, title, description } }),
    onSuccess: () => {
      toast.success(dict.toast.ticketCreated);
      setOpen(false);
      setTitle("");
      setDescription("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = tickets.filter((tk) => {
    if (status !== "all" && tk.status !== status) return false;
    const q = search.toLowerCase();
    return !q || tk.ref.toLowerCase().includes(q) || tk.title.toLowerCase().includes(q) || tk.property.toLowerCase().includes(q);
  });

  const columns: Column<FmTicketRow>[] = [
    {
      key: "title", header: dict.common.name, sortable: true,
      render: (tk) => (
        <span>
          <span className="block font-medium text-foreground">{tk.title}</span>
          <span className="tnum block text-xs text-muted-foreground">{tk.ref} · {tk.property}{tk.unitCode ? ` · ${tk.unitCode}` : ""}</span>
        </span>
      ),
    },
    { key: "category", header: dict.facility.ticketsFm.newTicketCategory, sortable: true, render: (tk) => dict.entity.ticketCategory[tk.category as keyof typeof dict.entity.ticketCategory] ?? tk.category },
    { key: "priority", header: dict.common.priority, sortable: true, render: (tk) => <StatusBadge label={dict.status[tk.priority as Priority] ?? tk.priority} tone={PRIORITY_TONE[tk.priority as Priority] ?? "neutral"} dot={false} /> },
    { key: "status", header: dict.common.status, sortable: true, render: (tk) => <StatusBadge label={dict.status[tk.status as TicketStatus] ?? tk.status} tone={TICKET_STATUS_TONE[tk.status as TicketStatus] ?? "neutral"} /> },
    {
      key: "vendor", header: t.vendor, sortable: true,
      render: (tk) =>
        tk.vendor ? (
          <span className="text-foreground">{tk.vendor}</span>
        ) : (
          <select
            value=""
            onChange={(e) => e.target.value && update.mutate({ id: tk.id, body: { vendorId: e.target.value } })}
            aria-label={t.assignVendor}
            className="h-7 max-w-36 rounded border border-input bg-secondary/60 px-1.5 text-xs text-muted-foreground outline-none"
          >
            <option value="" className="bg-popover">{t.unassigned}</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id} className="bg-popover">{v.name}</option>
            ))}
          </select>
        ),
    },
    { key: "scheduledFor", header: dict.tenant.maintenanceTenant.scheduledFor, sortable: true, render: (tk) => <span className="tnum text-xs text-muted-foreground">{tk.scheduledFor ? fmtDate(tk.scheduledFor, locale) : "—"}</span> },
    {
      key: "actions", header: dict.common.actions, sortable: false,
      render: (tk) => {
        const next = FLOW[tk.status];
        if (!next) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <Button size="sm" variant="outline" disabled={update.isPending}
            className="h-7 gap-1 border-[#c5a880]/40 px-2 text-xs text-[#dcc39a] hover:bg-[#c5a880]/10"
            onClick={() => update.mutate({ id: tk.id, body: { status: next } })}>
            <ArrowRight className="size-3 rtl:rotate-180" aria-hidden />
            {dict.status[next]}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder={dict.common.searchPlaceholder} className="w-full sm:w-64" />
        <FilterSelect value={status} onChange={setStatus} ariaLabel={dict.common.status}
          options={[{ value: "all", label: dict.common.all }, ...(["open", "in_progress", "resolved", "closed"] as const).map((s) => ({ value: s, label: dict.status[s] }))]} />
        <Button size="sm" onClick={() => setOpen(true)} className="ms-auto bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
          <Plus className="size-4" aria-hidden />
          {t.createTicket}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={Wrench} title={t.empty} description={dict.common.noResultsFor} />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.createTicket}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="ft-title" className="text-xs text-muted-foreground">{t.newTicketTitle}</Label>
              <Input id="ft-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary/60" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ft-prop" className="text-xs text-muted-foreground">{t.newTicketProperty}</Label>
                <select id="ft-prop" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                  {properties.map((p) => (
                    <option key={p.id} value={p.id} className="bg-popover">{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ft-cat" className="text-xs text-muted-foreground">{t.newTicketCategory}</Label>
                <select id="ft-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                  {Object.entries(dict.entity.ticketCategory).map(([v, l]) => (
                    <option key={v} value={v} className="bg-popover">{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ft-pri" className="text-xs text-muted-foreground">{t.newTicketPriority}</Label>
                <select id="ft-pri" value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <option key={p} value={p} className="bg-popover">{dict.status[p]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ft-desc" className="text-xs text-muted-foreground">{t.newTicketDesc}</Label>
              <Textarea id="ft-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20 bg-secondary/60" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border bg-transparent">{dict.common.cancel}</Button>
              <Button type="submit" disabled={create.isPending} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
                <UserCog className="size-4" aria-hidden />
                {t.createTicket}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

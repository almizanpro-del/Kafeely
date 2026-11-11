"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderLock, Upload, FileText, Lock } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { fmtDate, num } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type DocRow = { id: string; name: string; category: string; sizeKb: number; status: string; uploadedAt: string; unitCode: string | null };

const DOC_TONE: Record<string, "success" | "warning" | "danger"> = { verified: "success", pending: "warning", expired: "danger" };

export function DocumentsView({
  docs, unitOptions, dict, locale, canUpload = true,
}: {
  docs: DocRow[];
  unitOptions?: { id: string; code: string }[];
  dict: Dictionary;
  locale: Locale;
  canUpload?: boolean;
}) {
  const t = dict.landlord.documents;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [docCategory, setDocCategory] = React.useState("lease");
  const [unitId, setUnitId] = React.useState(unitOptions?.[0]?.id ?? "");

  const create = useMutation({
    mutationFn: () => api("/api/documents", { body: { name, category: docCategory, unitId: unitId || undefined } }),
    onSuccess: () => {
      toast.success(t.uploadToast);
      setOpen(false);
      setName("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = React.useMemo(
    () =>
      docs.filter((d) => {
        if (category !== "all" && d.category !== category) return false;
        const q = search.toLowerCase();
        return !q || d.name.toLowerCase().includes(q) || (d.unitCode ?? "").toLowerCase().includes(q);
      }),
    [docs, search, category]
  );

  const columns: Column<DocRow>[] = [
    {
      key: "name", header: dict.common.name, sortable: true,
      render: (d) => (
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{d.name}</span>
            {d.unitCode && <span className="tnum block text-xs text-muted-foreground">{d.unitCode}</span>}
          </span>
        </span>
      ),
    },
    { key: "category", header: t.category, sortable: true, render: (d) => dict.entity.docCategory[d.category as keyof typeof dict.entity.docCategory] ?? d.category },
    { key: "sizeKb", header: t.size, sortable: true, render: (d) => <span className="tnum text-muted-foreground">{d.sizeKb > 1024 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${num(d.sizeKb)} KB`}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (d) => <StatusBadge label={dict.status[d.status] ?? d.status} tone={DOC_TONE[d.status] ?? "neutral"} /> },
    { key: "uploadedAt", header: t.uploaded, sortable: true, render: (d) => <span className="tnum text-xs text-muted-foreground">{fmtDate(d.uploadedAt, locale)}</span> },
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
          { value: category, onChange: setCategory, options: [{ value: "all", label: dict.common.all }, ...Object.entries(dict.entity.docCategory).map(([v, l]) => ({ value: v, label: l }))], ariaLabel: t.category },
        ]}
        toolbarExtra={
          canUpload ? (
            <Button size="sm" onClick={() => setOpen(true)} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
              <Upload className="size-4" aria-hidden />
              {t.upload}
            </Button>
          ) : undefined
        }
        emptyState={<EmptyState icon={FolderLock} title={t.empty} description={t.emptyDesc} />}
      />
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="size-3" aria-hidden />
        {t.protectedHint}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.upload}</DialogTitle>
            <DialogDescription>{t.uploadDesc}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="doc-name" className="text-xs text-muted-foreground">{t.docName}</Label>
              <Input id="doc-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ejari Certificate — MG1-1204.pdf" className="bg-secondary/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="doc-cat" className="text-xs text-muted-foreground">{t.chooseCategory}</Label>
                <select id="doc-cat" value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                  {Object.entries(dict.entity.docCategory).map(([v, l]) => (
                    <option key={v} value={v} className="bg-popover">{l}</option>
                  ))}
                </select>
              </div>
              {unitOptions && unitOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="doc-unit" className="text-xs text-muted-foreground">{dict.landlord.units.unit}</Label>
                  <select id="doc-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
                    <option value="" className="bg-popover">—</option>
                    {unitOptions.map((u) => (
                      <option key={u.id} value={u.id} className="bg-popover">{u.code}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border bg-transparent">{dict.common.cancel}</Button>
              <Button type="submit" disabled={create.isPending} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">{dict.common.submit}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

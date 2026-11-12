"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FolderLock, Upload, FileText, Lock, Eye, Download, Printer, Trash2,
  ExternalLink, FileWarning,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, downloadUrl, printUrl } from "@/lib/api-client";
import { fmtDate, num } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type DocRow = {
  id: string;
  name: string;
  category: string;
  sizeKb: number;
  status: string;
  uploadedAt: string;
  unitCode: string | null;
  hasFile: boolean;
  mimeType: string | null;
  fileName: string | null;
};

const DOC_TONE: Record<string, "success" | "warning" | "danger"> = { verified: "success", pending: "warning", expired: "danger" };
const MAX_MB = 10;

function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

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
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<DocRow | null>(null);
  const [deleting, setDeleting] = React.useState<DocRow | null>(null);

  // upload form state
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [docCategory, setDocCategory] = React.useState("lease");
  const [unitId, setUnitId] = React.useState(unitOptions?.[0]?.id ?? "");

  const fileUrl = React.useCallback((d: DocRow, download = false) => `/api/documents/${d.id}/file${download ? "?download=1" : ""}`, []);

  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData();
      if (!file) throw new Error("missing_file");
      form.append("file", file);
      if (name.trim()) form.append("name", name.trim());
      form.append("category", docCategory);
      if (unitId) form.append("unitId", unitId);
      return api("/api/documents", { form });
    },
    onSuccess: () => {
      toast.success(t.uploadToast);
      setUploadOpen(false);
      setFile(null);
      setName("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t.deleteToast);
      setDeleting(null);
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
        <button
          type="button"
          onClick={() => (d.hasFile ? setViewing(d) : toast.info(t.noFile))}
          className="flex items-center gap-2.5 text-start"
          title={d.hasFile ? t.view : t.noFile}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground group-hover:text-[#c5a880]">{d.name}</span>
            {d.unitCode && <span className="tnum block text-xs text-muted-foreground">{d.unitCode}</span>}
          </span>
        </button>
      ),
    },
    { key: "category", header: t.category, sortable: true, render: (d) => dict.entity.docCategory[d.category as keyof typeof dict.entity.docCategory] ?? d.category },
    { key: "sizeKb", header: t.size, sortable: true, render: (d) => <span className="tnum text-muted-foreground">{d.sizeKb > 1024 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${num(d.sizeKb)} KB`}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (d) => <StatusBadge label={dict.status[d.status] ?? d.status} tone={DOC_TONE[d.status] ?? "neutral"} /> },
    { key: "uploadedAt", header: t.uploaded, sortable: true, render: (d) => <span className="tnum text-xs text-muted-foreground">{fmtDate(d.uploadedAt, locale)}</span> },
    {
      key: "actions", header: dict.common.actions, sortable: false,
      render: (d) => (
        <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground"
            title={t.view} aria-label={t.view}
            onClick={() => (d.hasFile ? setViewing(d) : toast.info(t.noFile))}
          >
            <Eye className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground"
            disabled={!d.hasFile}
            title={t.download} aria-label={t.download}
            onClick={() => downloadUrl(fileUrl(d, true), d.fileName ?? undefined)}
          >
            <Download className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground"
            disabled={!d.hasFile}
            title={t.print} aria-label={t.print}
            onClick={() => printUrl(fileUrl(d))}
          >
            <Printer className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-rose-400"
            title={t.del} aria-label={t.del}
            onClick={() => setDeleting(d)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </span>
      ),
    },
  ];

  const previewable = isPreviewable(viewing?.mimeType ?? null);

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
            <Button size="sm" onClick={() => setUploadOpen(true)} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
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

      {/* ── Viewer ─────────────────────────────────────────────── */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl border-border bg-popover">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-display text-xl">
                  <FileText className="size-5 text-[#c5a880]" aria-hidden />
                  <span className="truncate">{viewing.name}</span>
                </DialogTitle>
                <DialogDescription>
                  {viewing.fileName ?? viewing.name} · {dict.entity.docCategory[viewing.category as keyof typeof dict.entity.docCategory] ?? viewing.category}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                {previewable ? (
                  viewing.mimeType?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl(viewing)}
                      alt={viewing.name}
                      className="mx-auto max-h-[62vh] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <iframe
                      src={fileUrl(viewing)}
                      title={viewing.name}
                      className="h-[62vh] w-full bg-white"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <FileWarning className="size-10 text-[#c5a880]" aria-hidden />
                    <p className="max-w-sm text-sm text-muted-foreground">{t.noPreview}</p>
                    <Button
                      size="sm" onClick={() => downloadUrl(fileUrl(viewing, true), viewing.fileName ?? undefined)}
                      className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]"
                    >
                      <Download className="size-4" aria-hidden />
                      {t.download}
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline" className="border-border bg-transparent"
                  onClick={() => window.open(fileUrl(viewing), "_blank", "noopener")}
                >
                  <ExternalLink className="size-4 rtl:rotate-180" aria-hidden />
                  {t.openTab}
                </Button>
                <Button variant="outline" className="border-border bg-transparent" onClick={() => printUrl(fileUrl(viewing))}>
                  <Printer className="size-4" aria-hidden />
                  {t.print}
                </Button>
                <Button
                  onClick={() => downloadUrl(fileUrl(viewing, true), viewing.fileName ?? undefined)}
                  className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]"
                >
                  <Download className="size-4" aria-hidden />
                  {t.download}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ─────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        destructive
        title={t.deleteTitle}
        body={deleting ? `${t.deleteBody} "${deleting.name}"` : undefined}
        confirmLabel={dict.common.delete}
        cancelLabel={dict.common.cancel}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />

      {/* ── Upload ─────────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.upload}</DialogTitle>
            <DialogDescription>{t.uploadDesc}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!file) {
                toast.error(t.fileRequired);
                return;
              }
              if (file.size > MAX_MB * 1024 * 1024) {
                toast.error(t.fileTooLarge);
                return;
              }
              upload.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="doc-file" className="text-xs text-muted-foreground">{t.file}</Label>
              <Input
                id="doc-file" type="file" required
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
                }}
                className="cursor-pointer bg-secondary/60 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#c5a880] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#0b132b]"
              />
              <p className="text-[11px] text-muted-foreground">{t.fileHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-name" className="text-xs text-muted-foreground">{t.docName}</Label>
              <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ejari Certificate — MG1-1204.pdf" className="bg-secondary/60" />
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
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} className="border-border bg-transparent">{dict.common.cancel}</Button>
              <Button type="submit" disabled={upload.isPending} className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">{dict.common.submit}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  sortable?: boolean;
  /** value used for sorting; defaults to row[key] */
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
};

export type TableFilter = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  ariaLabel: string;
};

export function downloadCsv<T>(rows: T[], columns: Column<T>[], filename: string) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => esc((c as { csv?: (row: T) => unknown }).csv ? (c as { csv: (row: T) => unknown }).csv(r) : "")).join(","));
  const blob = new Blob(["\uFEFF" + [header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ps-9 h-9 bg-secondary/60"
        aria-label={placeholder ?? "Search"}
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="h-9 rounded-md border border-input bg-secondary/60 px-3 text-sm text-foreground shadow-xs outline-none transition focus:border-ring focus:ring-1 focus:ring-ring/40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-popover text-popover-foreground">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  onExport,
  onRowClick,
  pageSize = 10,
  emptyState,
  loading,
  toolbarExtra,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: TableFilter[];
  onExport?: () => void;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyState?: React.ReactNode;
  loading?: boolean;
  toolbarExtra?: React.ReactNode;
  className?: string;
}) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(0);

  React.useEffect(() => setPage(0), [rows.length, search, sortKey, sortDir]);

  const sorted = React.useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const get = col.sortValue ?? ((r: T) => r[col.key as keyof T] as string | number);
    return [...rows].sort((a, b) => {
      const va = get(a) ?? "";
      const vb = get(b) ?? "";
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const hasToolbar = Boolean(search != null || filters?.length || onExport || toolbarExtra);

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {search != null && (
              <SearchInput value={search} onChange={onSearchChange ?? (() => {})} placeholder={searchPlaceholder} className="w-full sm:w-64" />
            )}
            {filters?.map((f, i) => (
              <FilterSelect key={i} value={f.value} onChange={f.onChange} options={f.options} ariaLabel={f.ariaLabel} />
            ))}
            {toolbarExtra}
          </div>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="shrink-0">
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : pageRows.length === 0 ? (
        emptyState ?? <div className="p-10 text-center text-sm text-muted-foreground">—</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block thin-scroll">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((c) => (
                    <TableHead key={c.key} className={cn("whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground", c.className)}>
                      {c.sortable !== false ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 transition hover:text-foreground"
                          onClick={() => {
                            if (sortKey === c.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                            else { setSortKey(c.key); setSortDir("asc"); }
                          }}
                          aria-label={`Sort by ${c.header}`}
                        >
                          {c.header}
                          <ArrowUpDown className={cn("size-3", sortKey === c.key ? "text-[#c5a880]" : "opacity-40")} aria-hidden />
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn("border-border/60", onRowClick && "cursor-pointer")}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={cn("text-sm", c.className)}>
                        {c.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-border/60 md:hidden">
            {pageRows.map((row) => (
              <li
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("space-y-2 p-4", onRowClick && "cursor-pointer active:bg-secondary/40")}
              >
                {columns.slice(0, 6).map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{c.header}</span>
                    <span className="min-w-0 truncate text-end">{c.render(row)}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          {sorted.length > pageSize && (
            <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
              <span className="tnum">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} / {sorted.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="tnum px-1">{page + 1} / {pageCount}</span>
                <Button variant="ghost" size="icon" className="size-7" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

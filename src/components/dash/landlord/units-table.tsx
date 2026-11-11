"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, BedDouble, Bath, Maximize, Eye } from "lucide-react";
import { DataTable, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { aed, fmtDate, num } from "@/lib/format";
import { PROTECTION_TONE, UNIT_STATUS_TONE } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { LandlordUnitRow } from "@/lib/data/landlord";

export function UnitsTable({
  units, dict, locale,
}: {
  units: LandlordUnitRow[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.landlord.units;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [protection, setProtection] = React.useState("all");
  const [property, setProperty] = React.useState("all");
  const [selected, setSelected] = React.useState<LandlordUnitRow | null>(null);

  const properties = React.useMemo(() => Array.from(new Set(units.map((u) => u.property))), [units]);

  const filtered = React.useMemo(
    () =>
      units.filter((u) => {
        if (status !== "all" && u.status !== status) return false;
        if (protection !== "all" && u.protectionStatus !== protection) return false;
        if (property !== "all" && u.property !== property) return false;
        const q = search.toLowerCase();
        return !q || [u.code, u.property, u.district, u.tenant ?? ""].some((v) => v.toLowerCase().includes(q));
      }),
    [units, search, status, protection, property]
  );

  const columns: Column<LandlordUnitRow>[] = [
    {
      key: "code", header: t.unit, sortable: true,
      render: (u) => <span className="tnum font-semibold text-foreground">{u.code}</span>,
    },
    {
      key: "property", header: t.property, sortable: true,
      render: (u) => (
        <span>
          <span className="block text-foreground">{locale === "ar" && u.propertyAr ? u.propertyAr : u.property}</span>
          <span className="block text-xs text-muted-foreground">{locale === "ar" && u.districtAr ? u.districtAr : u.district}</span>
        </span>
      ),
    },
    { key: "type", header: t.type, sortable: true, render: (u) => dict.entity.unitType[u.type as keyof typeof dict.entity.unitType] ?? u.type },
    { key: "rentAed", header: t.rent, sortable: true, render: (u) => <span className="tnum">{aed(u.rentAed)}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (u) => <StatusBadge label={dict.status[u.status]} tone={UNIT_STATUS_TONE[u.status]} /> },
    { key: "protectionStatus", header: dict.nav.protection, sortable: true, render: (u) => <StatusBadge label={dict.status[u.protectionStatus]} tone={PROTECTION_TONE[u.protectionStatus]} /> },
    {
      key: "tenant", header: t.tenant, sortable: true,
      render: (u) => u.tenant ? <span className="text-foreground">{u.tenant}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "leaseEnd", header: t.leaseEnd, sortable: true,
      render: (u) => u.leaseEnd ? <span className="tnum text-muted-foreground">{fmtDate(u.leaseEnd, locale)}</span> : <span className="text-muted-foreground">—</span>,
    },
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
          { value: status, onChange: setStatus, options: [{ value: "all", label: t.filterStatus }, ...(["occupied", "vacant", "under_notice", "maintenance"] as const).map((s) => ({ value: s, label: dict.status[s] }))], ariaLabel: t.filterStatus },
          { value: protection, onChange: setProtection, options: [{ value: "all", label: t.filterProtection }, ...(["protected", "pending", "unprotected"] as const).map((s) => ({ value: s, label: dict.status[s] }))], ariaLabel: t.filterProtection },
          { value: property, onChange: setProperty, options: [{ value: "all", label: dict.common.all }, ...properties.map((p) => ({ value: p, label: p }))], ariaLabel: t.property },
        ]}
        onExport={() => import("@/components/shared/data-table").then((m) => m.downloadCsv(filtered, columns, "kafeely-units.csv"))}
        onRowClick={(u) => setSelected(u)}
        emptyState={<EmptyState icon={Building2} title={t.empty} description={dict.common.noResultsFor} />}
      />

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg border-border bg-popover">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {t.unitDetails} · <span className="tnum text-[#c5a880]">{selected.code}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Detail label={t.property} value={locale === "ar" && selected.propertyAr ? selected.propertyAr : selected.property} />
                <Detail label={t.type} value={dict.entity.unitType[selected.type as keyof typeof dict.entity.unitType] ?? selected.type} />
                <Detail label={t.floor} value={num(selected.floor)} />
                <Detail label={t.size} value={`${num(selected.sizeSqm)} m²`} />
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BedDouble className="size-4" aria-hidden /> {num(selected.bedrooms)}
                  <Bath className="ms-2 size-4" aria-hidden /> {num(selected.bathrooms)}
                  <Maximize className="ms-2 size-4" aria-hidden /> {num(selected.sizeSqm)} m²
                </div>
                <Detail label={t.view} value={selected.view ?? "—"} icon={<Eye className="inline size-3.5" />} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{dict.common.status}</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <StatusBadge label={dict.status[selected.status]} tone={UNIT_STATUS_TONE[selected.status]} />
                    <StatusBadge label={dict.status[selected.protectionStatus]} tone={PROTECTION_TONE[selected.protectionStatus]} />
                  </div>
                </div>
                <Detail label={t.rent} value={aed(selected.rentAed)} />
                <div className="col-span-2 rounded-lg border border-border/70 bg-secondary/40 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.leaseInfo}</p>
                  {selected.leaseRef ? (
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <span><span className="text-muted-foreground">{dict.landlord.leases.ref}:</span> <span className="tnum text-foreground">{selected.leaseRef}</span></span>
                      <span><span className="text-muted-foreground">{t.tenant}:</span> <span className="text-foreground">{selected.tenant}</span></span>
                      <span><span className="text-muted-foreground">{t.leaseEnd}:</span> <span className="tnum text-foreground">{fmtDate(selected.leaseEnd, locale)}</span></span>
                      <span>
                        <button className="text-xs font-medium text-[#c5a880] hover:underline" onClick={() => { setSelected(null); router.push("leases"); }}>
                          {dict.common.view} →
                        </button>
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">{t.noLease}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label} {icon}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

"use client";

import * as React from "react";
import { LayoutGrid, BedDouble } from "lucide-react";
import { FilterSelect } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { UNIT_STATUS_TONE, PROTECTION_TONE, type UnitStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import type { getFmBoardUnits } from "@/lib/data/facility";

type Unit = Awaited<ReturnType<typeof getFmBoardUnits>>[number];

const TILE_BG: Record<UnitStatus, string> = {
  occupied: "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-400/50",
  vacant: "border-border bg-card hover:border-[#c5a880]/40",
  under_notice: "border-amber-500/30 bg-amber-500/10 hover:border-amber-400/50",
  maintenance: "border-rose-500/30 bg-rose-500/10 hover:border-rose-400/50",
};

export function UnitBoard({ units, dict }: { units: Unit[]; dict: Dictionary }) {
  const t = dict.facility.board;
  const [property, setProperty] = React.useState("all");
  const [groupByFloor, setGroupByFloor] = React.useState(true);
  const properties = React.useMemo(() => Array.from(new Set(units.map((u) => u.property))), [units]);

  const filtered = units.filter((u) => property === "all" || u.property === property);

  const grouped = React.useMemo(() => {
    if (!groupByFloor) return null;
    const map = new Map<number, Unit[]>();
    for (const u of filtered) {
      const arr = map.get(u.floor) ?? [];
      arr.push(u);
      map.set(u.floor, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered, groupByFloor]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          value={property}
          onChange={setProperty}
          ariaLabel={t.selectProperty}
          options={[{ value: "all", label: dict.facility.announcements.allProperties }, ...properties.map((p) => ({ value: p, label: p }))]}
        />
        <button
          type="button"
          onClick={() => setGroupByFloor((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-secondary/60 px-3 text-sm text-muted-foreground transition hover:text-foreground"
          aria-pressed={groupByFloor}
        >
          <LayoutGrid className="size-4" aria-hidden />
          {t.group}
        </button>

        {/* Legend */}
        <span className="ms-auto flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{t.legend}:</span>
          {(["occupied", "vacant", "under_notice", "maintenance"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-sm border", TILE_BG[s])} aria-hidden />
              {dict.status[s]}
            </span>
          ))}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={LayoutGrid} title={t.empty} />
      ) : grouped ? (
        <div className="space-y-5">
          {grouped.map(([floor, floorUnits]) => (
            <div key={floor}>
              <p className="tnum mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dict.landlord.units.floor} {floor}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-10 xl:grid-cols-12">
                {floorUnits.map((u) => (
                  <div
                    key={u.id}
                    title={`${u.code} · ${dict.status[u.status]} · ${u.type}`}
                    className={cn("group rounded-lg border p-2 text-center transition-colors", TILE_BG[u.status])}
                  >
                    <p className="tnum truncate text-[11px] font-semibold text-foreground">{u.code}</p>
                    <p className="mt-0.5 flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
                      <BedDouble className="size-2.5" aria-hidden />
                      {u.bedrooms === 0 ? "St" : u.bedrooms}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-10 xl:grid-cols-12">
          {filtered.map((u) => (
            <div key={u.id} title={`${u.code} · ${dict.status[u.status]}`} className={cn("rounded-lg border p-2 text-center transition-colors", TILE_BG[u.status])}>
              <p className="tnum truncate text-[11px] font-semibold text-foreground">{u.code}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">{u.bedrooms === 0 ? "St" : u.bedrooms}</p>
            </div>
          ))}
        </div>
      )}

      {/* protection summary strip */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-xl border bg-card/60 px-5 py-3.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{t.legend} · {dict.nav.protection}:</span>
        {(["protected", "pending", "unprotected"] as const).map((s) => {
          const n = filtered.filter((u) => u.protectionStatus === s).length;
          return (
            <span key={s} className="flex items-center gap-1.5">
              <StatusBadge label={dict.status[s]} tone={PROTECTION_TONE[s]} />
              <span className="tnum font-semibold text-foreground">{n}</span>
            </span>
          );
        })}
      </div>
    </>
  );
}

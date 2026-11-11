"use client";

import Link from "next/link";
import { Building2, MapPin, CalendarDays, LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressRows } from "@/components/charts/charts";
import { num } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { getFmProperties } from "@/lib/data/facility";

type Props = Awaited<ReturnType<typeof getFmProperties>>;

export function PropertiesView({ properties, dict, locale }: { properties: Props; dict: Dictionary; locale: Locale }) {
  const t = dict.facility.propertiesFm;
  if (!properties.length) {
    return <EmptyState icon={Building2} title={t.empty} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {properties.map((p) => (
        <article key={p.id} className="card-hover flex flex-col rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-semibold text-foreground">
                {locale === "ar" && p.nameAr ? p.nameAr : p.name}
              </h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden />
                {locale === "ar" && p.districtAr ? p.districtAr : p.district}
              </p>
            </div>
            <StatusBadge
              label={`${p.occupancyPct}% ${dict.facility.overview.occupancy.toLowerCase()}`}
              tone={p.occupancyPct >= 80 ? "success" : p.occupancyPct >= 60 ? "warning" : "neutral"}
            />
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: t.unitsCount, value: num(p.unitsTotal) },
              { label: t.floors, value: num(p.totalFloors) },
              { label: t.yearBuilt, value: p.yearBuilt ?? "—" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border/70 bg-secondary/40 px-2 py-2">
                <dd className="tnum text-sm font-semibold text-foreground">{s.value}</dd>
                <dt className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <ProgressRows
              rows={(Object.entries(p.byStatus) as [string, number][])
                .filter(([, v]) => v > 0)
                .map(([k, v]) => ({
                  label: dict.status[k as "occupied"],
                  value: v,
                  max: p.unitsTotal,
                  color: k === "occupied" ? "#3dd68c" : k === "under_notice" ? "#f0b24a" : k === "maintenance" ? "#f26d6d" : "#8fa3c8",
                  valueLabel: String(v),
                }))}
            />
          </div>

          {p.amenities && (
            <p className="mt-3 line-clamp-1 text-[11px] text-muted-foreground">
              {p.amenities.split(",").join(" · ")}
            </p>
          )}

          <Link
            href="board"
            className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#c5a880]/40 bg-[#c5a880]/10 text-sm font-medium text-[#dcc39a] transition hover:bg-[#c5a880]/20"
          >
            <LayoutGrid className="size-4" aria-hidden />
            {t.manageBoard}
          </Link>
          <span className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/60">
            <CalendarDays className="size-3" aria-hidden />
            {dict.common.lastUpdated}: {new Date().toLocaleDateString(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB")}
          </span>
        </article>
      ))}
    </div>
  );
}

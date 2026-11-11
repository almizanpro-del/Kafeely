"use client";

/**
 * Hand-rolled SVG micro-charts.
 * RTL-safe: pure SVG, logical layout, direction-agnostic rendering.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const GOLD = "#c5a880";
const CHART_COLORS = ["#c5a880", "#8fa3c8", "#3dd68c", "#f0b24a", "#f26d6d", "#b48ead"];

// ── Donut ────────────────────────────────────────────────────────────
type DonutDatum = { label: string; value: number; color?: string };

function donutSegments(data: DonutDatum[], total: number, circumference: number) {
  let acc = 0;
  return data.map((d, i) => {
    const dash = (d.value / total) * circumference;
    const seg = { ...d, index: i, dash, offset: acc };
    acc += dash;
    return seg;
  });
}

export function DonutChart({
  data,
  size = 132,
  thickness = 14,
  centerLabel,
  centerValue,
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  // precompute segment offsets (pure, module-level helper)
  const segments = donutSegments(data, total, c);
  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel ?? "chart"}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#16234a" strokeWidth={thickness} />
            {segments.map((seg) => (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color ?? CHART_COLORS[seg.index % CHART_COLORS.length]}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(seg.dash - 2, 0)} ${c - Math.max(seg.dash - 2, 0)}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            ))}
          </g>
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="tnum text-xl font-semibold text-foreground">{centerValue}</span>
            {centerLabel && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
              <span className="truncate text-muted-foreground">{d.label}</span>
            </span>
            <span className="tnum font-medium text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Vertical bars ────────────────────────────────────────────────────
export function MiniBars({
  series,
  labels,
  height = 140,
  format = "plain",
  className,
}: {
  series: { name: string; color: string; values: number[] }[];
  labels?: string[];
  height?: number;
  /** value formatting for tooltips — serializable (server → client safe) */
  format?: "aed" | "aedCompact" | "plain";
  className?: string;
}) {
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const n = series[0]?.values.length ?? 0;
  const fmt = (v: number) =>
    format === "aed" ? `AED ${v.toLocaleString("en-US")}` : format === "aedCompact" ? `AED ${(v / 1000).toFixed(0)}K` : String(v);
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label="bar chart">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end justify-center gap-0.5">
            {series.map((s) => (
              <div
                key={s.name}
                className="w-full max-w-3 rounded-t transition-all duration-500 group-hover:opacity-80"
                style={{ height: `${Math.max((s.values[i] / max) * 100, 2)}%`, background: s.color, opacity: 0.85 }}
              />
            ))}
            <span className="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] text-foreground shadow-md group-hover:block">
              {labels?.[i] ? `${labels[i]} · ` : ""}
              {series.map((s) => fmt(s.values[i])).join(" / ")}
            </span>
          </div>
        ))}
      </div>
      {labels && (
        <div className="mt-2 flex gap-1.5 text-center text-[9px] text-muted-foreground">
          {labels.map((l, i) => (
            <span key={i} className="flex-1 truncate">{l}</span>
          ))}
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Area sparkline ───────────────────────────────────────────────────
export function Sparkline({
  values,
  color = GOLD,
  height = 48,
  className,
}: {
  values: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const w = 100;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1 || 1)) * w, height - ((v - min) / range) * (height - 6) - 3]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const id = React.useId();
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ── Horizontal progress rows ─────────────────────────────────────────
export function ProgressRows({
  rows,
  className,
}: {
  rows: { label: string; value: number; max: number; color?: string; valueLabel?: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-4", className)}>
      {rows.map((r) => {
        const pct = Math.min(Math.round((r.value / (r.max || 1)) * 100), 100);
        return (
          <li key={r.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-foreground">{r.label}</span>
              <span className="tnum shrink-0 text-muted-foreground">{r.valueLabel ?? `${r.value} / ${r.max}`}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: r.color ?? GOLD }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={r.label}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Heatmap grid ─────────────────────────────────────────────────────
export function Heatmap({
  rowLabels,
  colLabels,
  values,
  lowLabel,
  highLabel,
  className,
}: {
  rowLabels: string[];
  colLabels: string[];
  /** values[row][col] */
  values: number[][];
  lowLabel?: string;
  highLabel?: string;
  className?: string;
}) {
  const max = Math.max(...values.flat(), 1);
  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-x-auto thin-scroll">
        <table className="w-full min-w-[480px] border-separate border-spacing-1" role="img" aria-label="heatmap">
          <thead>
            <tr>
              <th aria-hidden />
              {colLabels.map((c) => (
                <th key={c} className="pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((rl, ri) => (
              <tr key={rl}>
                <td className="pe-2 text-end text-xs text-muted-foreground whitespace-nowrap">{rl}</td>
                {colLabels.map((_, ci) => {
                  const v = values[ri]?.[ci] ?? 0;
                  const intensity = v / max;
                  return (
                    <td key={ci}>
                      <div
                        title={`${rl} · ${colLabels[ci]}: ${v}`}
                        className="grid h-9 place-items-center rounded-md border border-border/50 text-[11px] font-medium text-foreground transition-transform hover:scale-105"
                        style={{
                          background: v === 0 ? "#101c3d" : `rgba(197, 168, 128, ${0.12 + intensity * 0.75})`,
                        }}
                      >
                        <span className="tnum">{v || ""}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          <span>{lowLabel}</span>
          <span className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg, #101c3d, rgba(197,168,128,0.85))" }} aria-hidden />
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Funnel bars ──────────────────────────────────────────────────────
export function FunnelBars({
  steps,
  className,
}: {
  steps: { label: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="tnum font-medium text-foreground">
              {s.value}
              {i > 0 && steps[0].value > 0 && (
                <span className="ms-1.5 text-[10px] text-muted-foreground">
                  {Math.round((s.value / steps[0].value) * 100)}%
                </span>
              )}
            </span>
          </div>
          <div className="h-6 overflow-hidden rounded-md bg-secondary">
            <div
              className="flex h-full items-center justify-end rounded-md px-2 transition-all duration-700"
              style={{
                width: `${Math.max((s.value / max) * 100, 6)}%`,
                background: `linear-gradient(90deg, rgba(197,168,128,${0.9 - i * 0.16}), rgba(197,168,128,${0.55 - i * 0.1}))`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

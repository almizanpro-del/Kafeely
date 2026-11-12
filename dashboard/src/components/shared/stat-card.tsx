import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  accent = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  hint?: string;
  accent?: boolean;
  className?: string;
}) {
  const DeltaIcon = deltaTone === "up" ? TrendingUp : deltaTone === "down" ? TrendingDown : Minus;
  return (
    <div
      className={cn(
        "card-hover relative overflow-hidden rounded-xl border bg-card p-5",
        accent && "border-[#c5a880]/30",
        className
      )}
    >
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-[#c5a880]/10 blur-2xl"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="tnum mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {(delta || hint) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    deltaTone === "up" && "text-emerald-400",
                    deltaTone === "down" && "text-rose-400"
                  )}
                >
                  <DeltaIcon className="size-3" aria-hidden />
                  {delta}
                </span>
              )}
              {hint && <span className="truncate">{hint}</span>}
            </div>
          )}
        </div>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg border",
            accent ? "border-[#c5a880]/30 bg-[#c5a880]/10 text-[#dcc39a]" : "border-border bg-secondary text-muted-foreground"
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

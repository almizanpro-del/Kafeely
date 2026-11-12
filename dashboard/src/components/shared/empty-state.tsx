"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 text-center",
        compact ? "px-6 py-8" : "px-6 py-14",
        className
      )}
    >
      <span className="grid size-12 place-items-center rounded-full border border-[#c5a880]/25 bg-[#c5a880]/10">
        <Icon className="size-5 text-[#c5a880]" aria-hidden />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {action &&
        (action.href ? (
          <Button asChild size="sm" className="mt-4">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button size="sm" className="mt-4" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

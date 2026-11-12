import { TONE_CLASSES, TONE_DOTS, type Tone } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Consistent status pill across every dashboard. */
export function StatusBadge({
  label,
  tone,
  dot = true,
  className,
}: {
  label: string;
  tone: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", TONE_DOTS[tone])} aria-hidden />}
      {label}
    </span>
  );
}

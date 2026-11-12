"use client";

import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TriangleAlert } from "lucide-react";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  destructive,
  confirmLabel,
  cancelLabel,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: string;
  destructive?: boolean;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** extra content (e.g. temporary password reveal) */
  children?: React.ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border bg-popover">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-lg">
            {destructive && (
              <span className="grid size-8 place-items-center rounded-full bg-rose-500/10 text-rose-400">
                <TriangleAlert className="size-4" aria-hidden />
              </span>
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">{body}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border bg-transparent hover:bg-secondary">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              destructive
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-[#c5a880] text-[#0b132b] hover:bg-[#d4b98f]"
            )}
            onClick={() => onConfirm()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

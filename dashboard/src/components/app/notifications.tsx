"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ShieldAlert, Wrench, FileSignature, Receipt, KanbanSquare, Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";
import type { Locale } from "@/i18n/config";

type Notif = {
  id: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string;
  type: string; read: boolean; createdAt: string;
};

const TYPE_ICON: Record<string, React.ElementType> = {
  claim: ShieldAlert, ticket: Wrench, lease: FileSignature, payment: Receipt, lead: KanbanSquare, system: Info,
};

export function NotificationsBell({
  userId,
  unreadLabel,
  title,
  markAllLabel,
  emptyTitle,
  emptyBody,
  locale,
}: {
  userId: string;
  unreadLabel: string;
  title: string;
  markAllLabel: string;
  emptyTitle: string;
  emptyBody: string;
  locale: Locale;
}) {
  const [open, setOpen] = React.useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => api<{ notifications: Notif[]; unread: number }>(`/api/notifications?userId=${userId}`, { method: "GET" }),
    refetchInterval: 30_000,
  });

  const markAll = useMutation({
    mutationFn: () => api("/api/notifications", { body: { userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const unread = data?.unread ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative grid size-9 place-items-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition hover:border-[#c5a880]/40 hover:text-foreground"
        aria-label={`${title}${unread ? ` (${unread} ${unreadLabel})` : ""}`}
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="tnum absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#c5a880] px-1 text-[10px] font-bold text-[#0b132b]">
            {unread}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="end" className="w-full border-border bg-popover p-0 sm:max-w-md">
          <SheetHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={!unread || markAll.isPending} className="text-xs text-muted-foreground">
              <CheckCheck className="size-3.5" aria-hidden />
              {markAllLabel}
            </Button>
          </SheetHeader>
          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto thin-scroll">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !data?.notifications.length ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-full border border-[#c5a880]/25 bg-[#c5a880]/10">
                  <Bell className="size-5 text-[#c5a880]" aria-hidden />
                </span>
                <p className="mt-2 text-sm font-medium">{emptyTitle}</p>
                <p className="text-xs text-muted-foreground">{emptyBody}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Info;
                  return (
                    <li key={n.id} className={cn("flex gap-3 px-5 py-4", !n.read && "bg-[#c5a880]/[0.04]")}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {locale === "ar" ? n.titleAr : n.titleEn}
                          {!n.read && <span className="ms-2 inline-block size-1.5 rounded-full bg-[#c5a880] align-middle" aria-label={unreadLabel} />}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {locale === "ar" ? n.bodyAr : n.bodyEn}
                        </p>
                        <p className="tnum mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          {fmtDateTime(n.createdAt, locale)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

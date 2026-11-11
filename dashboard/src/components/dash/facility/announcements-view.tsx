"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Send } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { fmtDate } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Row = { id: string; title: string; body: string; audience: string; priority: string; property: string | null; sentAt: string };

const PRIORITY_TONE: Record<string, "info" | "warning" | "danger"> = { normal: "info", important: "warning", urgent: "danger" };

export function AnnouncementsView({
  announcements, properties, dict, locale,
}: {
  announcements: Row[];
  properties: { id: string; name: string }[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.facility.announcements;
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [propertyId, setPropertyId] = React.useState("");
  const [audience, setAudience] = React.useState("all");
  const [priority, setPriority] = React.useState("normal");

  const send = useMutation({
    mutationFn: () => api("/api/announcements", { body: { title, body, propertyId: propertyId || null, audience, priority } }),
    onSuccess: () => {
      toast.success(dict.toast.announcementSent);
      setTitle("");
      setBody("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="h-fit rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">{t.compose}</h2>
        <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="ann-title" className="text-xs text-muted-foreground">{t.annTitle}</Label>
            <Input id="ann-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary/60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body" className="text-xs text-muted-foreground">{t.annBody}</Label>
            <Textarea id="ann-body" required value={body} onChange={(e) => setBody(e.target.value)} className="min-h-24 bg-secondary/60" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ann-prop" className="text-xs text-muted-foreground">{t.annProperty}</Label>
              <select id="ann-prop" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-2 text-xs outline-none focus:border-ring">
                <option value="" className="bg-popover">{t.allProperties}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id} className="bg-popover">{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-aud" className="text-xs text-muted-foreground">{t.annAudience}</Label>
              <select id="ann-aud" value={audience} onChange={(e) => setAudience(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-2 text-xs outline-none focus:border-ring">
                {Object.entries(dict.entity.audience).map(([v, l]) => (
                  <option key={v} value={v} className="bg-popover">{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-pri" className="text-xs text-muted-foreground">{t.annPriority}</Label>
              <select id="ann-pri" value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-2 text-xs outline-none focus:border-ring">
                {["normal", "important", "urgent"].map((p) => (
                  <option key={p} value={p} className="bg-popover">{dict.status[p === "normal" ? "low" : p === "important" ? "high" : "urgent"]}</option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={send.isPending} className="w-full bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
            <Send className="size-4 rtl:rotate-180" aria-hidden />
            {t.broadcast}
          </Button>
        </form>
      </section>

      <div className="lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t.history}</h2>
        {announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title={t.empty} />
        ) : (
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.property ?? t.allProperties} · {dict.entity.audience[a.audience as keyof typeof dict.entity.audience] ?? a.audience}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <StatusBadge label={a.priority} tone={PRIORITY_TONE[a.priority] ?? "info"} dot={false} />
                    <time className="tnum text-[10px] text-muted-foreground">{fmtDate(a.sentAt, locale)}</time>
                  </div>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Mail } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { fmtDate } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

type InviteRow = { id: string; email: string; role: string; status: string; sentAt: string; acceptedAt: string | null };

export function InvitesView({
  invites, dict, locale,
}: {
  invites: InviteRow[];
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.landlord.invites;
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("tenant");

  const send = useMutation({
    mutationFn: () => api("/api/invites", { body: { email, role } }),
    onSuccess: () => {
      toast.success(t.toast.replace("{email}", email));
      setEmail("");
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const columns: Column<InviteRow>[] = [
    {
      key: "email", header: dict.common.email, sortable: true,
      render: (i) => (
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
            <Mail className="size-4" aria-hidden />
          </span>
          <span className="truncate font-medium text-foreground">{i.email}</span>
        </span>
      ),
    },
    { key: "role", header: t.invitedAs, sortable: true, render: (i) => dict.role[i.role as keyof typeof dict.role]?.label ?? i.role },
    { key: "sentAt", header: t.sentOn, sortable: true, render: (i) => <span className="tnum text-xs text-muted-foreground">{fmtDate(i.sentAt, locale)}</span> },
    {
      key: "status", header: dict.common.status, sortable: true,
      render: (i) => (
        <StatusBadge
          label={i.status === "accepted" ? `${dict.landlord.invites.acceptedOn} ${i.acceptedAt ? fmtDate(i.acceptedAt, locale) : ""}` : dict.landlord.invites.pendingAccept}
          tone={i.status === "accepted" ? "success" : "warning"}
        />
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="h-fit rounded-xl border bg-card p-5 lg:col-span-1">
        <h2 className="font-display text-lg font-semibold">{t.inviteTitle}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.inviteDesc}</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs text-muted-foreground">{dict.common.email}</Label>
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="bg-secondary/60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role" className="text-xs text-muted-foreground">{t.inviteRole}</Label>
            <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring">
              {["tenant", "broker", "landlord"].map((r) => (
                <option key={r} value={r} className="bg-popover">{dict.role[r as keyof typeof dict.role].label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={send.isPending} className="w-full bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
            <UserPlus className="size-4" aria-hidden />
            {t.sendInvite}
          </Button>
        </form>
      </section>

      <div className="lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t.sentInvites}</h2>
        <DataTable
          columns={columns}
          rows={invites}
          pageSize={8}
          emptyState={<EmptyState icon={UserPlus} title={t.empty} description={t.emptyDesc} />}
        />
      </div>
    </div>
  );
}

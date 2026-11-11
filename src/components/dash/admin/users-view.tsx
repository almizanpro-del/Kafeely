"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, KeyRound, Repeat, UserCheck, UserX, Ban } from "lucide-react";
import { DataTable, SearchInput, FilterSelect, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { fmtDate, initialsOf } from "@/lib/format";
import { ROLES, USER_STATUS_TONE, type UserStatus } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { AdminUserRow } from "@/lib/data/admin";

export function UsersView({ rows, dict, locale }: { rows: AdminUserRow[]; dict: Dictionary; locale: Locale }) {
  const t = dict.admin.users;
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [target, setTarget] = React.useState<AdminUserRow | null>(null);
  const [action, setAction] = React.useState<"suspend" | "reset_password" | "change_role" | null>(null);
  const [newRole, setNewRole] = React.useState("tenant");
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);

  const act = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api<{ tempPassword: string | null }>(`/api/users/${id}`, { method: "PATCH", body }),
    onSuccess: (data) => {
      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
      } else {
        toast.success(
          action === "suspend" ? dict.toast.userSuspended
          : action === "change_role" ? dict.toast.roleChanged
          : dict.toast.userReactivated
        );
      }
      setAction(null);
      router.refresh();
    },
    onError: () => toast.error(dict.common.errorTitle),
  });

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (role !== "all" && r.role !== role) return false;
        if (status !== "all" && r.status !== status) return false;
        const q = search.toLowerCase();
        return !q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      }),
    [rows, search, role, status]
  );

  const columns: Column<AdminUserRow>[] = [
    {
      key: "fullName", header: dict.common.name, sortable: true,
      render: (u) => (
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#c5a880]/15 text-[10px] font-semibold text-[#dcc39a]">
            {u.avatarSeed || initialsOf(u.fullName)}
          </span>
          <span>
            <span className="block font-medium text-foreground">{u.fullName}</span>
            <span className="block text-xs text-muted-foreground">{u.email}</span>
          </span>
        </span>
      ),
    },
    { key: "role", header: t.role, sortable: true, render: (u) => <span className="text-sm text-foreground">{dict.role[u.role as keyof typeof dict.role]?.label ?? u.role}</span> },
    { key: "organization", header: dict.profile.organization, render: (u) => <span className="text-xs text-muted-foreground">{u.organization ?? "—"}</span> },
    { key: "createdAt", header: t.joined, sortable: true, render: (u) => <span className="tnum text-xs text-muted-foreground">{fmtDate(u.createdAt, locale)}</span> },
    { key: "lastLoginAt", header: t.lastLogin, sortable: true, render: (u) => <span className="tnum text-xs text-muted-foreground">{u.lastLoginAt ? fmtDate(u.lastLoginAt, locale) : "—"}</span> },
    { key: "status", header: dict.common.status, sortable: true, render: (u) => <StatusBadge label={dict.status[u.status as UserStatus] ?? u.status} tone={USER_STATUS_TONE[u.status as UserStatus] ?? "neutral"} /> },
    {
      key: "actions", header: dict.common.actions, sortable: false, className: "min-w-[240px]",
      render: (u) => {
        if (u.role === "super_admin") return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {u.status === "pending" && (
              <Button size="sm" variant="outline" className="h-7 gap-1 border-emerald-500/30 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => act.mutate({ id: u.id, body: { action: "approve" } })}>
                <UserCheck className="size-3" aria-hidden /> {t.approve}
              </Button>
            )}
            {u.status === "active" && (
              <Button size="sm" variant="outline" className="h-7 gap-1 border-rose-500/30 px-2 text-xs text-rose-300 hover:bg-rose-500/10"
                onClick={() => { setTarget(u); setAction("suspend"); }}>
                <Ban className="size-3" aria-hidden /> {t.suspend}
              </Button>
            )}
            {u.status === "suspended" && (
              <Button size="sm" variant="outline" className="h-7 gap-1 border-emerald-500/30 px-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => act.mutate({ id: u.id, body: { action: "reactivate" } })}>
                <UserX className="size-3 rtl:rotate-180" aria-hidden /> {t.reactivate}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => { setTarget(u); setAction("reset_password"); }}>
              <KeyRound className="size-3" aria-hidden /> {t.resetPassword}
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => { setTarget(u); setAction("change_role"); setNewRole(u.role); }}>
              <Repeat className="size-3" aria-hidden /> {t.changeRole}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder={dict.common.searchPlaceholder} className="w-full sm:w-64" />
        <FilterSelect value={role} onChange={setRole} ariaLabel={t.role}
          options={[{ value: "all", label: t.role }, ...ROLES.map((r) => ({ value: r, label: dict.role[r].label }))]} />
        <FilterSelect value={status} onChange={setStatus} ariaLabel={dict.common.status}
          options={[{ value: "all", label: dict.common.all }, ...(["active", "pending", "suspended"] as const).map((s) => ({ value: s, label: dict.status[s] }))]} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={10}
        emptyState={<EmptyState icon={Users} title={t.empty} description={dict.common.noResultsFor} />}
      />

      {/* Suspend confirm */}
      <ConfirmDialog
        open={!!target && action === "suspend"}
        onOpenChange={(v) => !v && setTarget(null)}
        title={t.suspend}
        body={`${dict.confirm.body} — ${target?.fullName ?? ""}`}
        destructive
        confirmLabel={dict.confirm.confirmLabel}
        cancelLabel={dict.common.cancel}
        onConfirm={() => target && act.mutate({ id: target.id, body: { action: "suspend" } })}
      />

      {/* Reset password confirm */}
      <ConfirmDialog
        open={!!target && action === "reset_password"}
        onOpenChange={(v) => { if (!v) { setTarget(null); setTempPassword(null); } }}
        title={t.resetPassword}
        body={t.resetConfirm}
        confirmLabel={dict.confirm.confirmLabel}
        cancelLabel={dict.common.cancel}
        onConfirm={() => target && act.mutate({ id: target.id, body: { action: "reset_password" } })}
      >
        {tempPassword && (
          <div className="rounded-lg border border-[#c5a880]/30 bg-[#c5a880]/10 p-3.5 text-center">
            <p className="text-xs text-muted-foreground">{t.tempPassword}</p>
            <p className="tnum mt-1 font-mono text-lg font-semibold tracking-wider text-[#dcc39a]">{tempPassword}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{t.tempPasswordHint}</p>
          </div>
        )}
      </ConfirmDialog>

      {/* Change role dialog */}
      <ConfirmDialog
        open={!!target && action === "change_role"}
        onOpenChange={(v) => !v && setTarget(null)}
        title={t.changeRole}
        body={t.changeRoleConfirm}
        confirmLabel={dict.confirm.confirmLabel}
        cancelLabel={dict.common.cancel}
        onConfirm={() => target && act.mutate({ id: target.id, body: { action: "change_role", role: newRole } })}
      >
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-secondary/60 px-3 text-sm outline-none focus:border-ring"
          aria-label={t.role}
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="bg-popover">{dict.role[r].label}</option>
          ))}
        </select>
      </ConfirmDialog>
    </>
  );
}

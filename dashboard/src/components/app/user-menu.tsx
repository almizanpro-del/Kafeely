"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Repeat, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";
import { ROLES, type Role } from "@/lib/types";
import { initialsOf } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import { toast } from "sonner";

const DEMO_CREDS: Record<Role, string> = {
  super_admin: "zaid@kafeely.ae",
  landlord: "khalid@example.ae",
  tenant: "emma.thompson@example.com",
  broker: "sarah.haddad@metropremier.ae",
  agent: "yousef.amiri@metropremier.ae",
  facility: "laurent@primeserve.ae",
  leasing: "aisha@citywideleasing.ae",
};

export function UserMenu({
  fullName, avatarSeed, roleLabel, dict, showRoleSwitch,
}: {
  fullName: string;
  avatarSeed: string;
  roleLabel: string;
  dict: Dictionary;
  showRoleSwitch: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // /app/<slug>/... → profile inside the current role workspace
  const slug = pathname.split("/")[2] ?? "landlord";
  const profileHref = `/app/${slug}/profile`;

  const logout = useMutation({
    mutationFn: () => api("/api/auth/logout"),
    onSuccess: () => {
      toast.success(dict.toast.loggedOut);
      router.push("/sign-in");
      router.refresh();
    },
  });

  const switchRole = useMutation({
    mutationFn: (role: Role) => api("/api/auth/switch-role", { body: { role } }),
    onSuccess: (_d, role) => {
      router.push(`/app/${role.replace("_", "-")}`);
      router.refresh();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/60 py-1.5 ps-1.5 pe-2.5 transition hover:border-[#c5a880]/40 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={`${dict.common.profile}: ${fullName}`}
      >
        <Avatar className="size-7">
          <AvatarFallback className="bg-[#c5a880]/15 text-xs font-semibold text-[#dcc39a]">
            {avatarSeed || initialsOf(fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 text-start sm:block">
          <span className="block max-w-36 truncate text-xs font-medium leading-tight text-foreground">{fullName}</span>
          <span className="block text-[10px] leading-tight text-[#c5a880]">{roleLabel}</span>
        </span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {dict.common.profile}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => router.push(profileHref)} className="gap-2 text-sm">
          <Settings className="size-4" aria-hidden />
          {dict.profile.title}
        </DropdownMenuItem>
        {showRoleSwitch && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Demo · switch role
            </DropdownMenuLabel>
            <div className="grid max-h-56 grid-cols-1 overflow-y-auto thin-scroll">
              {ROLES.filter((r) => r !== "super_admin" || roleLabel !== "Super Admin").map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => switchRole.mutate(r)}
                  className="gap-2 text-xs text-muted-foreground"
                >
                  <Repeat className="size-3.5" aria-hidden />
                  {dict.role[r].label}
                </DropdownMenuItem>
              ))}
            </div>
          </>
        )}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => logout.mutate()}
          className="gap-2 text-sm text-rose-400 focus:text-rose-300"
          disabled={logout.isPending}
        >
          <LogOut className="size-4 rtl:rotate-180" aria-hidden />
          {dict.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

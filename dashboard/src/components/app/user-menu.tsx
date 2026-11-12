"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { LogOut, Settings, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";
import { initialsOf } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import { toast } from "sonner";

export function UserMenu({
  fullName, avatarSeed, roleLabel, dict,
}: {
  fullName: string;
  avatarSeed: string;
  roleLabel: string;
  dict: Dictionary;
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

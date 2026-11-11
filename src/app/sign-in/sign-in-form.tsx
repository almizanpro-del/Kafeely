"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialsOf } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

type DemoAccount = { email: string; fullName: string; role: string; avatarSeed: string };

export function SignInForm({ dict, demoAccounts }: { dict: Dictionary; demoAccounts: DemoAccount[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const preselect = params.get("role");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const login = useMutation({
    mutationFn: () => api<{ role: string }>("/api/auth/login", { body: { email, password } }),
    onSuccess: (data) => {
      toast.success(dict.toast.loginSuccess);
      const next = params.get("next");
      router.push(next && next.startsWith("/app") ? next : `/app/${data.role.replace("_", "-")}`);
      router.refresh();
    },
    onError: (e: Error) => {
      toast.error(e.message.includes("suspended") ? dict.auth.accountSuspended : dict.auth.invalidCredentials);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate();
  };

  return (
    <div className="rounded-2xl border bg-card/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-muted-foreground">{dict.auth.email}</Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@company.ae"
              className="h-11 bg-secondary/60 ps-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs text-muted-foreground">{dict.auth.password}</Label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="password" type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••"
              className="h-11 bg-secondary/60 ps-9"
            />
          </div>
        </div>
        <Button
          type="submit" disabled={login.isPending}
          className="h-11 w-full bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]"
        >
          {login.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {dict.auth.signingIn}
            </>
          ) : (
            dict.auth.signIn
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-border/70 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {dict.auth.demoAccounts}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">{dict.auth.demoHint}</p>
        <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pe-1 thin-scroll">
          {demoAccounts.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword("Kafeely@2026");
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-start transition hover:border-[#c5a880]/40 hover:bg-secondary/50",
                  preselect && a.role === preselect.replace("-", "_") ? "border-[#c5a880]/50 bg-[#c5a880]/[0.06]" : "border-border/70"
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#c5a880]/15 text-[10px] font-semibold text-[#dcc39a]">
                  {a.avatarSeed || initialsOf(a.fullName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{a.fullName}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{a.email}</span>
                </span>
                <span className="shrink-0 text-[10px] font-medium text-[#c5a880]">{dict.role[a.role as keyof Dictionary["role"]]?.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

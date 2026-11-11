"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { api } from "@/lib/api-client";
import { Building2, FileSignature, ShieldAlert, Users, Wrench, KanbanSquare, Loader2, Search } from "lucide-react";
import { rolePath } from "@/lib/rbac";
import type { Role } from "@/lib/types";

type SearchResult = { id: string; kind: "unit" | "lease" | "claim" | "user" | "ticket" | "lead"; title: string; sub: string; role: Role; path?: string };

const KIND_ICON: Record<SearchResult["kind"], React.ElementType> = {
  unit: Building2, lease: FileSignature, claim: ShieldAlert, user: Users, ticket: Wrench, lead: KanbanSquare,
};

export function GlobalSearch({
  role, slug, open, onOpenChange, placeholder,
}: {
  role: Role;
  slug: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  placeholder: string;
}) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`, { method: "GET" });
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="max-w-xl">
      <div className="flex items-center gap-2 border-b border-border px-3">
        {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" /> : <Search className="size-4 shrink-0 text-muted-foreground" />}
        <CommandInput value={q} onValueChange={setQ} placeholder={placeholder} className="h-12 border-0 focus:ring-0" />
      </div>
      <CommandList className="min-h-64">
        <CommandEmpty>No results.</CommandEmpty>
        {["unit", "lease", "claim", "user", "ticket", "lead"].map((kind) => {
          const group = results.filter((r) => r.kind === kind);
          if (!group.length) return null;
          return (
            <CommandGroup key={kind} heading={kind.toUpperCase()}>
              {group.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.title} ${r.sub}`}
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(r.path ?? rolePath(role, ""));
                  }}
                  className="gap-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
                    {React.createElement(KIND_ICON[r.kind], { className: "size-4" })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { rolePath } from "@/lib/rbac";
import type { Role, RoleSlug } from "@/lib/types";
import { ROLE_SLUGS } from "@/lib/types";
import { NavIcon } from "./nav-icon";
import type { Dictionary } from "@/i18n";
import type { NavSection } from "@/lib/rbac";
import { ChevronLeft, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

function isActive(pathname: string, base: string, href?: string) {
  const full = href ? `${base}/${href}` : base;
  if (href) return pathname === full || pathname.startsWith(`${full}/`);
  return pathname === full || (pathname.startsWith(`${full}/`) && full !== "/app") ;
}

function NavLinks({
  sections, role, slug, nav, sectionLabels, collapsed, pathname,
}: {
  sections: NavSection[]; role: Role; slug: RoleSlug;
  nav: Dictionary["nav"]; sectionLabels: Dictionary["section"];
  collapsed: boolean; pathname: string;
}) {
  const base = rolePath(role, "");
  return (
    <nav aria-label="Dashboard sections" className="flex-1 space-y-6 overflow-y-auto px-3 py-4 thin-scroll">
      {sections.map((s) => (
        <div key={s.key}>
          {!collapsed && (
            <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {sectionLabels[s.key as keyof Dictionary["section"]]}
            </p>
          )}
          <ul className="space-y-1">
            {s.items.map((item) => {
              const full = item.href ? `${base}/${item.href}` : base;
              const active = isActive(pathname, base, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={full}
                    title={collapsed ? nav[item.key as keyof Dictionary["nav"]] : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-[#c5a880]/10 font-medium text-[#e2cba2]"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span aria-hidden className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-[#c5a880]" />
                    )}
                    <NavIcon name={item.icon} className="size-4.5 shrink-0" />
                    {!collapsed && <span className="truncate">{nav[item.key as keyof Dictionary["nav"]]}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  sections, role, dict, collapsed, onToggleCollapse, mobileOpen, onMobileClose,
}: {
  sections: NavSection[];
  role: Role;
  dict: Dictionary;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const slug = ROLE_SLUGS[role];
  const roleLabel = dict.role[role].label;

  const content = (collapsed: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        <Link href="/app" className="flex items-center gap-2.5" onClick={onMobileClose}>
          <span className="grid size-9 place-items-center rounded-lg border border-[#c5a880]/40 bg-[#0d1834]">
            { }
            <img src="/kafeely.svg" alt="" className="size-6" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-lg font-semibold leading-tight tracking-wide text-foreground">
                {dict.common.brand}
              </span>
              <span className="block truncate text-[10px] uppercase tracking-[0.16em] text-[#c5a880]">
                {roleLabel}
              </span>
            </span>
          )}
        </Link>
      </div>

      <NavLinks
        sections={sections}
        role={role}
        slug={slug}
        nav={dict.nav}
        sectionLabels={dict.section}
        collapsed={collapsed}
        pathname={pathname}
      />

      {/* Collapse toggle (desktop) */}
      <div className={cn("hidden border-t border-sidebar-border p-3 lg:block", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground",
            collapsed && "w-auto px-2"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4 rtl:rotate-180" /> : <PanelLeftClose className="size-4 rtl:rotate-180" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 hidden border-e border-sidebar-border bg-sidebar transition-[width] duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        {content(collapsed)}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onMobileClose}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 w-72 border-e border-sidebar-border bg-sidebar transition-transform duration-300 lg:hidden",
          // RTL: drawer enters from the inline-start edge
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <button
          type="button"
          onClick={onMobileClose}
          className="absolute end-3 top-4 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
        {content(false)}
      </aside>
    </>
  );
}

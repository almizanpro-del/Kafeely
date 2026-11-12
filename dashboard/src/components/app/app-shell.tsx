"use client";

import * as React from "react";
import { Menu, Search } from "lucide-react";
import { Sidebar } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationsBell } from "./notifications";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "./language-switcher";
import { NavIcon } from "./nav-icon";
import { ROLE_NAV, rolePath, type NavSection } from "@/lib/rbac";
import { ROLE_SLUGS, type Role } from "@/lib/types";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function AppShell({
  role, fullName, avatarSeed, dict, locale, children,
}: {
  role: Role;
  fullName: string;
  avatarSeed: string;
  dict: Dictionary;
  locale: Locale;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sections = ROLE_NAV[role] as NavSection[];
  const slug = ROLE_SLUGS[role];

  return (
    <div className="min-h-dvh lux-radial">
      <Sidebar
        sections={sections}
        role={role}
        dict={dict}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-300", collapsed ? "lg:ps-[76px]" : "lg:ps-64")}>
        {/* Topbar */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition hover:text-foreground lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-muted-foreground transition hover:border-[#c5a880]/40 sm:max-w-md"
            aria-label={dict.common.globalSearch}
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate text-start">{dict.common.searchPlaceholder}</span>
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              ⌘K
            </kbd>
          </button>

          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher locale={locale} label={dict.common.switchTo} />
            <NotificationsBell
              userId={fullName}
              unreadLabel={dict.common.unread}
              title={dict.notifications.title}
              markAllLabel={dict.common.markAllRead}
              emptyTitle={dict.common.noNotifications}
              emptyBody={dict.common.noNotificationsBody}
              locale={locale}
            />
            <UserMenu
              fullName={fullName}
              avatarSeed={avatarSeed}
              roleLabel={dict.role[role].label}
              dict={dict}
            />
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>

        <footer className="border-t border-border/60 px-4 py-4 text-center text-[11px] text-muted-foreground sm:px-6">
          {dict.common.brand} · {dict.common.poweredBy} · {new Date().getFullYear()}
        </footer>
      </div>

      <GlobalSearch
        role={role}
        slug={slug}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        placeholder={dict.common.searchPlaceholder}
      />
    </div>
  );
}

/** Sidebar link labels helper reused by the overview quick actions. */
export { rolePath, NavIcon };

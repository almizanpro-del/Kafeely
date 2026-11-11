import type { Role, RoleSlug } from "./types";
import { ROLE_SLUGS } from "./types";

export type NavItem = {
  /** dictionary key under `nav` */
  key: string;
  /** path relative to /app/<role-slug>/ */
  href?: string;
  /** lucide icon key resolved in Sidebar */
  icon: string;
};

export type NavSection = {
  /** dictionary key under `section` */
  key: string;
  items: NavItem[];
};

export const ROLE_NAV: Record<Role, NavSection[]> = {
  super_admin: [
    {
      key: "platform",
      items: [
        { key: "overview", icon: "LayoutDashboard" },
        { key: "waitlist", href: "waitlist", icon: "Inbox" },
        { key: "users", href: "users", icon: "Users" },
        { key: "claims", href: "claims", icon: "ShieldAlert" },
      ],
    },
    {
      key: "operations",
      items: [
        { key: "auditLog", href: "audit-log", icon: "ScrollText" },
        { key: "compliance", href: "compliance", icon: "BadgeCheck" },
        { key: "system", href: "system", icon: "Activity" },
      ],
    },
  ],
  landlord: [
    {
      key: "portfolio",
      items: [
        { key: "overview", icon: "LayoutDashboard" },
        { key: "units", href: "units", icon: "Building2" },
        { key: "leases", href: "leases", icon: "FileSignature" },
        { key: "financials", href: "financials", icon: "Wallet" },
      ],
    },
    {
      key: "operations",
      items: [
        { key: "claims", href: "claims", icon: "ShieldAlert" },
        { key: "documents", href: "documents", icon: "FolderLock" },
        { key: "invites", href: "invites", icon: "UserPlus" },
      ],
    },
  ],
  tenant: [
    {
      key: "account",
      items: [
        { key: "overview", icon: "Home" },
        { key: "protection", href: "protection", icon: "ShieldCheck" },
        { key: "maintenance", href: "maintenance", icon: "Wrench" },
        { key: "payments", href: "payments", icon: "Receipt" },
        { key: "claims", href: "claims", icon: "ShieldAlert" },
        { key: "documents", href: "documents", icon: "FolderLock" },
      ],
    },
  ],
  broker: [
    {
      key: "commercial",
      items: [
        { key: "overview", icon: "LayoutDashboard" },
        { key: "pipeline", href: "pipeline", icon: "KanbanSquare" },
        { key: "listings", href: "listings", icon: "Building2" },
        { key: "clients", href: "clients", icon: "Users" },
        { key: "commissions", href: "commissions", icon: "BadgeDollarSign" },
        { key: "activity", href: "activity", icon: "Activity" },
      ],
    },
  ],
  agent: [
    {
      key: "commercial",
      items: [
        { key: "overview", icon: "LayoutDashboard" },
        { key: "listings", href: "listings", icon: "Building2" },
        { key: "offers", href: "offers", icon: "Handshake" },
        { key: "clients", href: "clients", icon: "Users" },
        { key: "targets", href: "targets", icon: "Target" },
      ],
    },
    {
      key: "operations",
      items: [{ key: "team", href: "team", icon: "UsersRound" }],
    },
  ],
  facility: [
    {
      key: "operations",
      items: [
        { key: "overview", icon: "LayoutDashboard" },
        { key: "properties", href: "properties", icon: "Building2" },
        { key: "unitBoard", href: "board", icon: "LayoutGrid" },
        { key: "tickets", href: "tickets", icon: "Wrench" },
        { key: "inspections", href: "inspections", icon: "ClipboardCheck" },
      ],
    },
    {
      key: "network",
      items: [
        { key: "vendors", href: "vendors", icon: "Truck" },
        { key: "announcements", href: "announcements", icon: "Megaphone" },
      ],
    },
  ],
  leasing: [
    {
      key: "commercial",
      items: [
        { key: "overview", icon: "LayoutDashboard" },
        { key: "availableUnits", href: "available-units", icon: "Building2" },
        { key: "applications", href: "applications", icon: "Inbox" },
        { key: "viewings", href: "viewings", icon: "CalendarClock" },
        { key: "offers", href: "offers", icon: "Handshake" },
        { key: "documents", href: "documents", icon: "FileText" },
      ],
    },
  ],
};

export function roleSlug(role: Role): RoleSlug {
  return ROLE_SLUGS[role];
}

export function roleHomePath(role: Role): string {
  return `/app/${ROLE_SLUGS[role]}`;
}

export function rolePath(role: Role, sub: string): string {
  return `/app/${ROLE_SLUGS[role]}/${sub}`;
}

/** Roles allowed to reach a given role dashboard (v1: single primary role). */
export function canAccessRole(sessionRole: Role, targetRole: Role): boolean {
  return sessionRole === targetRole;
}

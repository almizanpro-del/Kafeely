"use client";

import {
  LayoutDashboard, Inbox, Users, ShieldAlert, ScrollText, BadgeCheck, Activity,
  Building2, FileSignature, Wallet, FolderLock, UserPlus, ShieldCheck, Wrench,
  Receipt, Home, KanbanSquare, BadgeDollarSign, UsersRound, Target, Handshake,
  LayoutGrid, ClipboardCheck, Truck, Megaphone, CalendarClock, FileText, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Inbox, Users, ShieldAlert, ScrollText, BadgeCheck, Activity,
  Building2, FileSignature, Wallet, FolderLock, UserPlus, ShieldCheck, Wrench,
  Receipt, Home, KanbanSquare, BadgeDollarSign, UsersRound, Target, Handshake,
  LayoutGrid, ClipboardCheck, Truck, Megaphone, CalendarClock, FileText,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden />;
}

/**
 * Kafeely — core domain types.
 * Statuses are string unions; Prisma stores them as plain strings so the
 * schema stays portable between SQLite (sandbox) and Postgres/Neon (prod).
 */

export const ROLES = [
  "super_admin",
  "landlord",
  "tenant",
  "broker",
  "agent",
  "facility",
  "leasing",
] as const;
export type Role = (typeof ROLES)[number];

/** URL slugs for role-scoped routes: /app/landlord, /app/super-admin, … */
export const ROLE_SLUGS = {
  super_admin: "super-admin",
  landlord: "landlord",
  tenant: "tenant",
  broker: "broker",
  agent: "agent",
  facility: "facility",
  leasing: "leasing",
} as const;
export type RoleSlug = (typeof ROLE_SLUGS)[Role];

export const SLUG_TO_ROLE: Record<string, Role> = Object.fromEntries(
  Object.entries(ROLE_SLUGS).map(([role, slug]) => [slug, role as Role])
) as Record<string, Role>;

// ── Status unions ────────────────────────────────────────────────────
export type UserStatus = "active" | "pending" | "suspended";
export type UnitStatus = "occupied" | "vacant" | "under_notice" | "maintenance";
export type ProtectionStatus = "protected" | "pending" | "unprotected";
export type LeaseStatus = "active" | "expiring_soon" | "upcoming" | "terminated";
export type ClaimType = "rent_default" | "damage" | "legal" | "early_termination" | "maintenance";
export type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected" | "settled";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "plumbing" | "electrical" | "hvac" | "cleaning" | "security" | "other";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type PaymentStatus = "paid" | "pending" | "overdue" | "upcoming";
export type LeadStage = "new" | "contacted" | "viewing" | "offer" | "negotiation" | "won" | "lost";
export type WaitlistStatus = "new" | "contacted" | "qualified" | "converted" | "erased";
export type ApplicationStatus = "new" | "screening" | "approved" | "rejected";
export type ViewingStatus = "scheduled" | "completed" | "no_show" | "cancelled";
export type OfferStatus = "pending" | "countered" | "accepted" | "declined";
export type DocumentCategory = "lease" | "addendum" | "certificate" | "invoice" | "statement" | "compliance" | "other";
export type InspectionStatus = "scheduled" | "completed" | "overdue";
export type AuditAction = string;

// ── Status → badge tone (consistent color language) ──────────────────
export type Tone = "success" | "warning" | "danger" | "info" | "gold" | "neutral";

export const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  danger: "bg-rose-500/10 text-rose-300 border-rose-500/25",
  info: "bg-[#8fa3c8]/10 text-[#aebdda] border-[#8fa3c8]/25",
  gold: "bg-[#c5a880]/10 text-[#dcc39a] border-[#c5a880]/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export const TONE_DOTS: Record<Tone, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-[#8fa3c8]",
  gold: "bg-[#c5a880]",
  neutral: "bg-slate-400",
};

export const UNIT_STATUS_TONE: Record<UnitStatus, Tone> = {
  occupied: "success",
  vacant: "neutral",
  under_notice: "warning",
  maintenance: "info",
};

export const PROTECTION_TONE: Record<ProtectionStatus, Tone> = {
  protected: "gold",
  pending: "warning",
  unprotected: "neutral",
};

export const CLAIM_STATUS_TONE: Record<ClaimStatus, Tone> = {
  submitted: "info",
  under_review: "warning",
  approved: "success",
  settled: "gold",
  rejected: "danger",
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export const TICKET_STATUS_TONE: Record<TicketStatus, Tone> = {
  open: "danger",
  in_progress: "warning",
  resolved: "success",
  closed: "neutral",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
  upcoming: "neutral",
};

export const LEAD_STAGE_TONE: Record<LeadStage, Tone> = {
  new: "info",
  contacted: "neutral",
  viewing: "gold",
  offer: "warning",
  negotiation: "warning",
  won: "success",
  lost: "danger",
};

export const WAITLIST_STATUS_TONE: Record<WaitlistStatus, Tone> = {
  new: "info",
  contacted: "neutral",
  qualified: "warning",
  converted: "gold",
  erased: "danger",
};

export const USER_STATUS_TONE: Record<UserStatus, Tone> = {
  active: "success",
  pending: "warning",
  suspended: "danger",
};

export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, Tone> = {
  new: "info",
  screening: "warning",
  approved: "success",
  rejected: "danger",
};

export const VIEWING_STATUS_TONE: Record<ViewingStatus, Tone> = {
  scheduled: "info",
  completed: "success",
  no_show: "danger",
  cancelled: "neutral",
};

export const OFFER_STATUS_TONE: Record<OfferStatus, Tone> = {
  pending: "warning",
  countered: "info",
  accepted: "success",
  declined: "danger",
};

export const INSPECTION_STATUS_TONE: Record<InspectionStatus, Tone> = {
  scheduled: "info",
  completed: "success",
  overdue: "danger",
};

// ── API row shapes (serialized, dates as ISO strings) ────────────────
export type Row = Record<string, unknown> & { id: string };

export interface UnitRow {
  id: string;
  code: string;
  property: string;
  district: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number;
  rentAed: number;
  status: UnitStatus;
  protectionStatus: ProtectionStatus;
  tenant?: string | null;
  leaseEnd?: string | null;
}

export interface ClaimRow {
  id: string;
  ref: string;
  unitCode: string;
  property: string;
  type: ClaimType;
  status: ClaimStatus;
  amountAed: number;
  priority: Priority;
  raisedBy: string;
  createdAt: string;
  description: string;
}

export interface TicketRow {
  id: string;
  ref: string;
  title: string;
  property: string;
  unitCode?: string | null;
  category: TicketCategory;
  priority: Priority;
  status: TicketStatus;
  vendor?: string | null;
  scheduledFor?: string | null;
  createdAt: string;
}

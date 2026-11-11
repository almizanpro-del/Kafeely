import "server-only";
import { db } from "@/lib/db";
import { iso, weeklyBuckets } from "./base";
import { ROLES } from "@/lib/types";

export async function getAdminOverview() {
  const [users, waitlist, protectedUnits, totalUnits, claims, audits, occupiedUnits] = await Promise.all([
    db.user.findMany({ select: { role: true, status: true, createdAt: true } }),
    db.waitlistEntry.findMany({ orderBy: { createdAt: "asc" } }),
    db.unit.count({ where: { protectionStatus: "protected" } }),
    db.unit.count(),
    db.claim.findMany({ where: { status: { in: ["submitted", "under_review"] } }, select: { status: true } }),
    db.auditLog.findMany({ include: { actor: false }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.unit.count({ where: { status: "occupied" } }),
  ]);

  const byRole: Record<string, number> = {};
  for (const r of ROLES) byRole[r] = 0;
  for (const u of users) byRole[u.role] = (byRole[u.role] ?? 0) + 1;

  const waitlistByStatus: Record<string, number> = { new: 0, contacted: 0, qualified: 0, converted: 0, erased: 0 };
  for (const w of waitlist) waitlistByStatus[w.status] = (waitlistByStatus[w.status] ?? 0) + 1;

  return {
    totalUsers: users.length,
    byRole,
    waitlistTotal: waitlist.length,
    waitlistByStatus,
    conversionPct: waitlist.length ? Math.round((waitlistByStatus.converted / waitlist.length) * 100) : 0,
    protectedUnits,
    totalUnits,
    occupiedUnits,
    openClaims: claims.length,
    signupTrend: weeklyBuckets(waitlist.map((w) => w.createdAt), 8),
    recentAudit: audits.map((a) => ({
      id: a.id, actorName: a.actorName, actorRole: a.actorRole, action: a.action,
      detail: a.detail, createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function getWaitlistEntries() {
  const rows = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((w) => ({
    id: w.id, fullName: w.fullName, email: w.email, phone: w.phone, audience: w.audience,
    source: w.source, status: w.status, notes: w.notes, createdAt: w.createdAt.toISOString(),
  }));
}

export type AdminUserRow = {
  id: string; fullName: string; email: string; role: string; status: string;
  organization: string | null; createdAt: string; lastLoginAt: string | null; avatarSeed: string;
};

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map((u) => ({
    id: u.id, fullName: u.fullName, email: u.email, role: u.role, status: u.status,
    organization: u.organization, createdAt: u.createdAt.toISOString(),
    lastLoginAt: iso(u.lastLoginAt), avatarSeed: u.avatarSeed,
  }));
}

export async function getAdminClaims() {
  const claims = await db.claim.findMany({
    include: { unit: { include: { property: true } }, raisedBy: true },
    orderBy: { createdAt: "desc" },
  });
  return claims.map((c) => ({
    id: c.id, ref: c.ref, unitCode: c.unit.code, property: c.unit.property.name,
    type: c.type, status: c.status, amountAed: c.amountAed, priority: c.priority,
    raisedBy: c.raisedBy.fullName, createdAt: c.createdAt.toISOString(), description: c.description,
  }));
}

export async function getAuditLogs() {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return logs.map((a) => ({
    id: a.id, actorName: a.actorName, actorRole: a.actorRole, action: a.action,
    entityType: a.entityType, entityId: a.entityId, detail: a.detail, ip: a.ip,
    createdAt: a.createdAt.toISOString(),
  }));
}

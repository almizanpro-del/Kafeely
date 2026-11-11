import "server-only";
import { db } from "@/lib/db";
import { iso } from "./base";

export async function getAgentTargets(agentId: string) {
  const rows = await db.target.findMany({ where: { userId: agentId }, orderBy: { period: "desc" } });
  return rows.map((t) => ({ id: t.id, period: t.period, metric: t.metric, target: t.target, actual: t.actual }));
}

export async function getAgencyTeam(agencyId: string) {
  const [users, targets] = await Promise.all([
    db.user.findMany({ where: { agencyId }, orderBy: { fullName: "asc" } }),
    db.target.findMany({ where: { user: { agencyId }, period: "2026-Q4" } }),
  ]);
  return users
    .filter((u) => u.role === "agent" || u.role === "broker")
    .map((u) => {
      const t = targets.filter((x) => x.userId === u.id);
      const deals = t.find((x) => x.metric === "deals");
      const revenue = t.find((x) => x.metric === "revenue");
      const listings = t.find((x) => x.metric === "listings");
      return {
        id: u.id, name: u.fullName, role: u.role, avatarSeed: u.avatarSeed,
        dealsTarget: deals?.target ?? 0, dealsActual: deals?.actual ?? 0,
        revenueTarget: revenue?.target ?? 0, revenueActual: revenue?.actual ?? 0,
        listingsTarget: listings?.target ?? 0, listingsActual: listings?.actual ?? 0,
      };
    });
}

export async function getAgentLeads(agentId: string) {
  const leads = await db.lead.findMany({ where: { ownerId: agentId }, orderBy: { updatedAt: "desc" } });
  return leads.map((l) => ({
    id: l.id, clientName: l.clientName, clientType: l.clientType, stage: l.stage,
    interest: l.interest, budgetAed: l.budgetAed, estCommissionAed: l.estCommissionAed,
    updatedAt: l.updatedAt.toISOString(),
  }));
}

export async function getLiveOffers() {
  const offers = await db.offer.findMany({
    include: { unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return offers.map((o) => ({
    id: o.id, unitCode: o.unit.code, property: o.unit.property.name,
    fromType: o.fromType, fromName: o.fromName, amountAed: o.amountAed,
    terms: o.terms, status: o.status, createdAt: o.createdAt.toISOString(),
  }));
}

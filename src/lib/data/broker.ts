import "server-only";
import { db } from "@/lib/db";
import { iso } from "./base";

export type LeadRow = {
  id: string; clientName: string; clientType: string; phone: string | null; email: string | null;
  stage: string; interest: string | null; budgetAed: number | null; estCommissionAed: number;
  source: string; notes: string | null; property: string | null; createdAt: string; updatedAt: string;
};

export async function getLeads(ownerId: string): Promise<LeadRow[]> {
  const leads = await db.lead.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
  });
  // resolve property names (Lead.propertyId is a soft reference)
  const propIds = Array.from(new Set(leads.map((l) => l.propertyId).filter((v): v is string => Boolean(v))));
  const props = propIds.length ? await db.property.findMany({ where: { id: { in: propIds } } }) : [];
  const propName = new Map(props.map((p) => [p.id, p.name]));
  return leads.map((l) => ({
    id: l.id, clientName: l.clientName, clientType: l.clientType, phone: l.phone, email: l.email,
    stage: l.stage, interest: l.interest, budgetAed: l.budgetAed, estCommissionAed: l.estCommissionAed,
    source: l.source, notes: l.notes, property: l.propertyId ? propName.get(l.propertyId) ?? null : null,
    createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString(),
  }));
}

export async function getCommissions(ownerId: string) {
  const rows = await db.commission.findMany({ where: { ownerId }, orderBy: { closedAt: "desc" } });
  return rows.map((c) => ({
    id: c.id, dealRef: c.dealRef, clientName: c.clientName, amountAed: c.amountAed,
    ratePct: c.ratePct, status: c.status, closedAt: iso(c.closedAt), paidAt: iso(c.paidAt),
  }));
}

export type BrokerListingRow = {
  id: string; code: string; property: string; district: string; type: string; rentAed: number;
  status: string; protectionStatus: string; enquiries: number;
};

export async function getBrokerListings(): Promise<BrokerListingRow[]> {
  const units = await db.unit.findMany({
    where: { status: { in: ["vacant", "under_notice"] } },
    include: { property: true },
    take: 10,
    orderBy: { code: "asc" },
  });
  return units.map((u, i) => ({
    id: u.id, code: u.code, property: u.property.name, district: u.property.district,
    type: u.type, rentAed: u.rentAed, status: u.status, protectionStatus: u.protectionStatus,
    enquiries: ((u.code.length * 7 + i * 13) % 9) + 2, // deterministic pseudo metric
  }));
}

export async function getClients(ownerId: string) {
  const leads = await db.lead.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } });
  const seen = new Map<string, { name: string; type: string; since: string; phone: string | null; email: string | null; leads: number }>();
  for (const l of leads) {
    const existing = seen.get(l.clientName);
    if (existing) existing.leads++;
    else
      seen.set(l.clientName, {
        name: l.clientName, type: l.clientType, since: l.createdAt.toISOString(),
        phone: l.phone, email: l.email, leads: 1,
      });
  }
  return Array.from(seen.values());
}

export async function getBrokerActivity(ownerId: string) {
  const [leads, commissions] = await Promise.all([
    db.lead.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" }, take: 10 }),
    db.commission.findMany({ where: { ownerId }, orderBy: { closedAt: "desc" }, take: 5 }),
  ]);
  const feed = [
    ...leads.map((l) => ({
      id: `lead-${l.id}`, kind: "lead" as const, title: `${l.clientName} — ${l.stage}`,
      detail: l.interest, at: l.updatedAt.toISOString(),
    })),
    ...commissions.map((c) => ({
      id: `com-${c.id}`, kind: "commission" as const, title: `${c.dealRef} — ${c.status}`,
      detail: `${c.clientName} · AED ${c.amountAed.toLocaleString()}`, at: (c.closedAt ?? c.paidAt ?? new Date()).toISOString(),
    })),
  ];
  return feed.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14);
}

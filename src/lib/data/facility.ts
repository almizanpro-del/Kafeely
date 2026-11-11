import "server-only";
import { db } from "@/lib/db";
import { iso } from "./base";

export async function getFmProperties(managerId: string) {
  const props = await db.property.findMany({
    where: { facilityManagerId: managerId },
    include: { units: { select: { status: true, protectionStatus: true } } },
    orderBy: { name: "asc" },
  });
  return props.map((p) => {
    const units = p.units;
    const byStatus: Record<string, number> = { occupied: 0, vacant: 0, under_notice: 0, maintenance: 0 };
    for (const u of units) byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
    return {
      id: p.id, name: p.name, nameAr: p.nameAr, district: p.district, districtAr: p.districtAr,
      address: p.address, type: p.type, totalFloors: p.totalFloors, yearBuilt: p.yearBuilt,
      amenities: p.amenities, unitsTotal: units.length, byStatus,
      occupancyPct: units.length ? Math.round((byStatus.occupied / units.length) * 100) : 0,
    };
  });
}

export type FmTicketRow = {
  id: string; ref: string; title: string; property: string; unitCode: string | null;
  category: string; priority: string; status: string; vendor: string | null;
  scheduledFor: string | null; createdAt: string;
};

export async function getFmTickets(managerId: string): Promise<FmTicketRow[]> {
  const tickets = await db.ticket.findMany({
    where: { property: { facilityManagerId: managerId } },
    include: { property: true, unit: true, vendor: true },
    orderBy: { createdAt: "desc" },
  });
  return tickets.map((t) => ({
    id: t.id, ref: t.ref, title: t.title, property: t.property.name, unitCode: t.unit?.code ?? null,
    category: t.category, priority: t.priority, status: t.status, vendor: t.vendor?.name ?? null,
    scheduledFor: iso(t.scheduledFor), createdAt: t.createdAt.toISOString(),
  }));
}

export async function getFmBoardUnits(managerId: string) {
  const units = await db.unit.findMany({
    where: { property: { facilityManagerId: managerId } },
    include: { property: { select: { name: true } } },
    orderBy: [{ propertyId: "asc" }, { floor: "desc" }, { code: "asc" }],
  });
  return units.map((u) => ({
    id: u.id, code: u.code, property: u.property.name, floor: u.floor,
    status: u.status, protectionStatus: u.protectionStatus, type: u.type,
  }));
}

export async function getVendors() {
  const vendors = await db.vendor.findMany({ orderBy: { rating: "desc" } });
  return vendors.map((v) => ({
    id: v.id, name: v.name, category: v.category, contactName: v.contactName, phone: v.phone,
    rating: v.rating, jobsCompleted: v.jobsCompleted, status: v.status,
  }));
}

export async function getFmInspections(managerId: string) {
  const inspections = await db.inspection.findMany({
    where: { property: { facilityManagerId: managerId } },
    include: { property: true, unit: true },
    orderBy: { scheduledFor: "desc" },
  });
  return inspections.map((i) => ({
    id: i.id, property: i.property.name, unitCode: i.unit?.code ?? null, type: i.type,
    scheduledFor: i.scheduledFor.toISOString(), status: i.status, inspector: i.inspector,
    findings: i.findings, complianceScore: i.complianceScore,
  }));
}

export async function getFmAnnouncements(managerId: string) {
  const anns = await db.announcement.findMany({
    where: { OR: [{ sentById: managerId }, { property: { facilityManagerId: managerId } }] },
    include: { property: true },
    orderBy: { sentAt: "desc" },
  });
  return anns.map((a) => ({
    id: a.id, title: a.title, body: a.body, audience: a.audience, priority: a.priority,
    property: a.property?.name ?? null, sentAt: a.sentAt.toISOString(),
  }));
}

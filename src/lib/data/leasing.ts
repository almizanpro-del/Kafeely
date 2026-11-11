import "server-only";
import { db } from "@/lib/db";

export async function getAvailableUnits() {
  const units = await db.unit.findMany({
    where: { status: { in: ["vacant", "under_notice"] } },
    include: { property: true },
    orderBy: { rentAed: "desc" },
  });
  return units.map((u) => ({
    id: u.id, code: u.code, property: u.property.name, district: u.property.district,
    districtAr: u.property.districtAr, type: u.type, bedrooms: u.bedrooms, bathrooms: u.bathrooms,
    sizeSqm: u.sizeSqm, rentAed: u.rentAed, status: u.status, protectionStatus: u.protectionStatus,
    floor: u.floor, view: u.view,
  }));
}

export type ApplicationRow = {
  id: string; ref: string; unitCode: string; property: string; applicantName: string;
  phone: string | null; email: string | null; nationality: string | null;
  monthlyIncomeAed: number | null; score: number | null; status: string; submittedAt: string;
};

export async function getApplications(): Promise<ApplicationRow[]> {
  const apps = await db.application.findMany({
    include: { unit: { include: { property: true } } },
    orderBy: { submittedAt: "desc" },
  });
  return apps.map((a) => ({
    id: a.id, ref: a.ref, unitCode: a.unit.code, property: a.unit.property.name,
    applicantName: a.applicantName, phone: a.phone, email: a.email, nationality: a.nationality,
    monthlyIncomeAed: a.monthlyIncomeAed, score: a.score, status: a.status,
    submittedAt: a.submittedAt.toISOString(),
  }));
}

export type ViewingRow = {
  id: string; unitCode: string; property: string; leadName: string; phone: string | null;
  agentName: string | null; scheduledAt: string; status: string;
};

export async function getViewings(): Promise<ViewingRow[]> {
  const viewings = await db.viewing.findMany({
    include: { unit: { include: { property: true } } },
    orderBy: { scheduledAt: "asc" },
  });
  return viewings.map((v) => ({
    id: v.id, unitCode: v.unit.code, property: v.unit.property.name, leadName: v.leadName,
    phone: v.phone, agentName: v.agentName, scheduledAt: v.scheduledAt.toISOString(), status: v.status,
  }));
}

export async function getLeasingOffers() {
  const offers = await db.offer.findMany({
    include: { unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
  return offers.map((o) => ({
    id: o.id, unitCode: o.unit.code, property: o.unit.property.name, fromType: o.fromType,
    fromName: o.fromName, amountAed: o.amountAed, terms: o.terms, status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));
}

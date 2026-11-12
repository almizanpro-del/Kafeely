import "server-only";
import { db } from "@/lib/db";
import { iso } from "./base";
import type { ClaimRow, LeaseStatus, ProtectionStatus, UnitStatus } from "@/lib/types";

export type LandlordUnitRow = {
  id: string; code: string; property: string; propertyAr: string | null; district: string; districtAr: string | null;
  type: string; bedrooms: number; bathrooms: number; sizeSqm: number; rentAed: number;
  status: UnitStatus; protectionStatus: ProtectionStatus; floor: number; view: string | null;
  tenant: string | null; leaseRef: string | null; leaseEnd: string | null; leaseStatus: LeaseStatus | null;
};

export async function getLandlordUnits(landlordId: string): Promise<LandlordUnitRow[]> {
  const units = await db.unit.findMany({
    where: { landlordId },
    include: {
      property: true,
      leases: { where: { status: { in: ["active", "expiring_soon"] } }, include: { tenant: true }, orderBy: { endDate: "desc" }, take: 1 },
    },
    orderBy: { code: "asc" },
  });
  return units.map((u) => ({
    id: u.id,
    code: u.code,
    property: u.property.name,
    propertyAr: u.property.nameAr,
    district: u.property.district,
    districtAr: u.property.districtAr,
    type: u.type,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    sizeSqm: u.sizeSqm,
    rentAed: u.rentAed,
    status: u.status as UnitStatus,
    protectionStatus: u.protectionStatus as ProtectionStatus,
    floor: u.floor,
    view: u.view,
    tenant: u.leases[0]?.tenant.fullName ?? null,
    leaseRef: u.leases[0]?.ref ?? null,
    leaseEnd: iso(u.leases[0]?.endDate),
    leaseStatus: (u.leases[0]?.status as LeaseStatus) ?? null,
  }));
}

export type LandlordLeaseRow = {
  id: string; ref: string; unitCode: string; property: string; tenant: string;
  startDate: string; endDate: string; rentAed: number; paymentFrequency: number;
  status: LeaseStatus; ejariNumber: string | null; protectionEnrolled: boolean;
};

export async function getLandlordLeases(landlordId: string): Promise<LandlordLeaseRow[]> {
  const leases = await db.lease.findMany({
    where: { landlordId },
    include: { unit: { include: { property: true } }, tenant: true },
    orderBy: { endDate: "asc" },
  });
  return leases.map((l) => ({
    id: l.id, ref: l.ref, unitCode: l.unit.code, property: l.unit.property.name,
    tenant: l.tenant.fullName, startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(),
    rentAed: l.rentAed, paymentFrequency: l.paymentFrequency, status: l.status as LeaseStatus,
    ejariNumber: l.ejariNumber, protectionEnrolled: l.protectionEnrolled,
  }));
}

export async function getLandlordClaims(landlordId: string): Promise<ClaimRow[]> {
  const claims = await db.claim.findMany({
    where: { unit: { landlordId } },
    include: { unit: { include: { property: true } }, raisedBy: true },
    orderBy: { createdAt: "desc" },
  });
  return claims.map((c) => ({
    id: c.id, ref: c.ref, unitCode: c.unit.code, property: c.unit.property.name,
    type: c.type as ClaimRow["type"], status: c.status as ClaimRow["status"], amountAed: c.amountAed,
    priority: c.priority as ClaimRow["priority"], raisedBy: c.raisedBy.fullName,
    createdAt: c.createdAt.toISOString(), description: c.description,
  }));
}

export type PaymentRow = {
  id: string; ref: string; unitCode: string; tenant: string; installmentNo: number;
  amountAed: number; dueDate: string; paidDate: string | null; method: string; status: string;
};

export async function getLandlordPayments(landlordId: string): Promise<PaymentRow[]> {
  const payments = await db.payment.findMany({
    where: { lease: { landlordId } },
    include: { lease: { include: { unit: true, tenant: true } } },
    orderBy: { dueDate: "asc" },
  });
  return payments.map((p) => ({
    id: p.id, ref: p.lease.ref, unitCode: p.lease.unit.code, tenant: p.lease.tenant.fullName,
    installmentNo: p.installmentNo, amountAed: p.amountAed, dueDate: p.dueDate.toISOString(),
    paidDate: iso(p.paidDate), method: p.method, status: p.status,
  }));
}

export async function getLandlordDocuments(landlordId: string) {
  const docs = await db.document.findMany({
    where: { OR: [{ ownerRole: "landlord", ownerId: landlordId }, { unit: { landlordId } }] },
    include: { unit: true },
    orderBy: { uploadedAt: "desc" },
  });
  return docs.map((d) => ({
    id: d.id, name: d.name, category: d.category, sizeKb: d.sizeKb, status: d.status,
    uploadedAt: d.uploadedAt.toISOString(), unitCode: d.unit?.code ?? null,
    hasFile: d.fileData !== null, mimeType: d.mimeType, fileName: d.fileName,
  }));
}

export async function getLandlordInvites(landlordId: string) {
  const invites = await db.invite.findMany({ where: { ownerId: landlordId }, orderBy: { sentAt: "desc" } });
  return invites.map((i) => ({
    id: i.id, email: i.email, role: i.role, status: i.status,
    sentAt: i.sentAt.toISOString(), acceptedAt: iso(i.acceptedAt),
  }));
}

export type LandlordOverview = {
  units: LandlordUnitRow[];
  leases: LandlordLeaseRow[];
  claims: ClaimRow[];
  payments: PaymentRow[];
};

export async function getLandlordOverview(landlordId: string): Promise<LandlordOverview> {
  const [units, leases, claims, payments] = await Promise.all([
    getLandlordUnits(landlordId),
    getLandlordLeases(landlordId),
    getLandlordClaims(landlordId),
    getLandlordPayments(landlordId),
  ]);
  return { units, leases, claims, payments };
}

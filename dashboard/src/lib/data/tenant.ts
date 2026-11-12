import "server-only";
import { db } from "@/lib/db";
import { iso } from "./base";

export async function getTenantLease(tenantId: string) {
  const lease = await db.lease.findFirst({
    where: { tenantId, status: { in: ["active", "expiring_soon"] } },
    include: { unit: { include: { property: true } }, landlord: true, payments: { orderBy: { dueDate: "asc" } } },
    orderBy: { endDate: "desc" },
  });
  if (!lease) return null;
  const nextPayment = lease.payments.find((p) => p.status !== "paid");
  return {
    id: lease.id, ref: lease.ref, unitCode: lease.unit.code, property: lease.unit.property.name,
    propertyAr: lease.unit.property.nameAr, district: lease.unit.property.district,
    districtAr: lease.unit.property.districtAr, type: lease.unit.type, bedrooms: lease.unit.bedrooms,
    sizeSqm: lease.unit.sizeSqm, floor: lease.unit.floor, view: lease.unit.view,
    protectionStatus: lease.unit.protectionStatus,
    landlord: lease.landlord.fullName, startDate: lease.startDate.toISOString(),
    endDate: lease.endDate.toISOString(), rentAed: lease.rentAed,
    paymentFrequency: lease.paymentFrequency, ejariNumber: lease.ejariNumber,
    protectionEnrolled: lease.protectionEnrolled,
    nextPayment: nextPayment
      ? { id: nextPayment.id, amountAed: nextPayment.amountAed, dueDate: nextPayment.dueDate.toISOString(), status: nextPayment.status, installmentNo: nextPayment.installmentNo }
      : null,
    paymentsPaid: lease.payments.filter((p) => p.status === "paid").length,
    paymentsTotal: lease.payments.length,
  };
}

export type TenantTicketRow = {
  id: string; ref: string; title: string; category: string; priority: string; status: string;
  scheduledFor: string | null; createdAt: string; unitCode: string;
};

export async function getTenantTickets(tenantId: string): Promise<TenantTicketRow[]> {
  const tickets = await db.ticket.findMany({
    where: { raisedById: tenantId },
    include: { unit: true },
    orderBy: { createdAt: "desc" },
  });
  return tickets.map((t) => ({
    id: t.id, ref: t.ref, title: t.title, category: t.category, priority: t.priority,
    status: t.status, scheduledFor: iso(t.scheduledFor), createdAt: t.createdAt.toISOString(),
    unitCode: t.unit?.code ?? "—",
  }));
}

export async function getTenantPayments(tenantId: string) {
  const payments = await db.payment.findMany({
    where: { lease: { tenantId } },
    include: { lease: { include: { unit: true } } },
    orderBy: { dueDate: "asc" },
  });
  return payments.map((p) => ({
    id: p.id, installmentNo: p.installmentNo, amountAed: p.amountAed,
    dueDate: p.dueDate.toISOString(), paidDate: iso(p.paidDate), method: p.method, status: p.status,
    unitCode: p.lease.unit.code,
  }));
}

export async function getTenantDocuments(tenantId: string) {
  const docs = await db.document.findMany({
    where: { OR: [{ ownerRole: "tenant", ownerId: tenantId }, { lease: { tenantId } }] },
    include: { unit: true },
    orderBy: { uploadedAt: "desc" },
  });
  return docs.map((d) => ({
    id: d.id, name: d.name, category: d.category, sizeKb: d.sizeKb, status: d.status,
    uploadedAt: d.uploadedAt.toISOString(), unitCode: d.unit?.code ?? null,
    hasFile: d.fileData !== null, mimeType: d.mimeType, fileName: d.fileName,
  }));
}

export async function getTenantClaims(tenantId: string) {
  const claims = await db.claim.findMany({
    where: { raisedById: tenantId },
    include: { unit: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
  return claims.map((c) => ({
    id: c.id, ref: c.ref, unitCode: c.unit.code, property: c.unit.property.name,
    type: c.type, status: c.status, amountAed: c.amountAed, priority: c.priority,
    description: c.description, createdAt: c.createdAt.toISOString(),
  }));
}

export async function getTenantUnitForCreate(tenantId: string) {
  const lease = await db.lease.findFirst({
    where: { tenantId, status: { in: ["active", "expiring_soon"] } },
    include: { unit: { include: { property: true } } },
  });
  return lease
    ? { unitId: lease.unit.id, propertyId: lease.unit.propertyId, unitCode: lease.unit.code, property: lease.unit.property.name }
    : null;
}

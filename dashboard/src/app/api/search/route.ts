import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rolePath } from "@/lib/rbac";
import type { Role } from "@/lib/types";

type Hit = { id: string; kind: string; title: string; sub: string; role: Role; path?: string };

/** Global search across the entities the signed-in role can see. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = { contains: q };
  const results: Hit[] = [];
  const role = session.role;

  // Units — visible to landlord (own), facility (managed), super_admin, leasing (vacant)
  const units = await db.unit.findMany({
    where: {
      OR: [{ code: like }, { property: { name: like }, }, { property: { district: like } }],
      ...(role === "landlord" ? { landlordId: session.sub } : {}),
      ...(role === "facility" ? { property: { facilityManagerId: session.sub } } : {}),
      ...(role === "tenant" ? { leases: { some: { tenantId: session.sub } } } : {}),
    },
    include: { property: true },
    take: 5,
  });
  for (const u of units) {
    results.push({
      id: u.id, kind: "unit", title: u.code, sub: `${u.property.name} · ${u.property.district}`,
      role,
      path: role === "landlord" ? rolePath(role, "units") : role === "facility" ? rolePath(role, "board") : role === "leasing" ? rolePath(role, "available-units") : rolePath(role, ""),
    });
  }

  // Leases — landlord / tenant / admin
  if (role !== "facility") {
    const leases = await db.lease.findMany({
      where: {
        OR: [{ ref: like }, { tenant: { fullName: like } }, { ejariNumber: like }],
        ...(role === "landlord" ? { landlordId: session.sub } : {}),
        ...(role === "tenant" ? { tenantId: session.sub } : {}),
      },
      include: { unit: true, tenant: true },
      take: 5,
    });
    for (const l of leases) {
      results.push({
        id: l.id, kind: "lease", title: l.ref, sub: `${l.unit.code} · ${l.tenant.fullName}`, role,
        path: role === "tenant" ? rolePath(role, "payments") : rolePath(role, "leases"),
      });
    }
  }

  // Claims
  if (role !== "tenant" && role !== "facility") {
    const claims = await db.claim.findMany({
      where: {
        OR: [{ ref: like }, { description: like }],
        ...(role === "landlord" ? { unit: { landlordId: session.sub } } : {}),
      },
      include: { unit: true },
      take: 5,
    });
    for (const c of claims) {
      results.push({
        id: c.id, kind: "claim", title: c.ref, sub: `${c.unit.code} · ${c.status.replace("_", " ")}`, role,
        path: rolePath(role, "claims"),
      });
    }
  }

  // Users — admin only
  if (role === "super_admin") {
    const users = await db.user.findMany({
      where: { OR: [{ fullName: like }, { email: like }] },
      take: 5,
    });
    for (const u of users) {
      results.push({ id: u.id, kind: "user", title: u.fullName, sub: `${u.email} · ${u.role}`, role, path: rolePath(role, "users") });
    }
  }

  // Tickets — facility / tenant
  if (role === "facility" || role === "tenant") {
    const tickets = await db.ticket.findMany({
      where: {
        OR: [{ ref: like }, { title: like }],
        ...(role === "tenant" ? { raisedById: session.sub } : { property: { facilityManagerId: session.sub } }),
      },
      include: { property: true },
      take: 5,
    });
    for (const t of tickets) {
      results.push({
        id: t.id, kind: "ticket", title: t.title, sub: `${t.ref} · ${t.property.name}`, role,
        path: rolePath(role, "maintenance"),
      });
    }
  }

  // Leads — broker / agent
  if (role === "broker" || role === "agent") {
    const leads = await db.lead.findMany({
      where: { ownerId: session.sub, OR: [{ clientName: like }, { interest: like }] },
      take: 5,
    });
    for (const l of leads) {
      results.push({ id: l.id, kind: "lead", title: l.clientName, sub: `${l.stage} · ${l.interest ?? ""}`, role, path: rolePath(role, "pipeline") });
    }
  }

  return NextResponse.json({ results: results.slice(0, 20) });
}

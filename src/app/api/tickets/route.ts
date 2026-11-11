import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { writeAudit } from "@/lib/data/base";
import { TICKET_STATUS_TONE } from "@/lib/types";

/** Create ticket (tenant request / FM create). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    unitId?: string; propertyId?: string; category?: string; priority?: string;
    title?: string; description?: string; scheduledFor?: string;
  };
  if (!body.propertyId || !body.title) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const count = await db.ticket.count();
  const ref = `TKT-2026-${String(count + 130).padStart(4, "0")}`;
  const ticket = await db.ticket.create({
    data: {
      ref, propertyId: body.propertyId, unitId: body.unitId ?? null, raisedById: session.sub,
      category: body.category ?? "other", priority: body.priority ?? "medium", status: "open",
      title: body.title, description: body.description ?? null,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
    },
  });
  await writeAudit({
    actorId: session.sub, actorName: session.fullName, actorRole: session.role,
    action: "ticket.create", entityType: "Ticket", entityId: ticket.id, detail: `Ticket ${ref} created`,
  });
  return NextResponse.json({ ok: true, ticket });
}

/** Update ticket: status advance / vendor assignment. */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, status, vendorId, scheduledFor } = (await req.json()) as {
    id?: string; status?: string; vendorId?: string | null; scheduledFor?: string | null;
  };
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (status && !(status in TICKET_STATUS_TONE)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const ticket = await db.ticket.update({
    where: { id },
    data: {
      ...(status ? { status, resolvedAt: ["resolved", "closed"].includes(status) ? new Date() : null } : {}),
      ...(vendorId !== undefined ? { assignedVendorId: vendorId || null } : {}),
      ...(scheduledFor !== undefined ? { scheduledFor: scheduledFor ? new Date(scheduledFor) : null } : {}),
    },
  });
  await writeAudit({
    actorId: session.sub, actorName: session.fullName, actorRole: session.role,
    action: "ticket.update", entityType: "Ticket", entityId: id,
    detail: `Ticket ${ticket.ref} updated${status ? ` → ${status}` : ""}${vendorId ? ` (vendor assigned)` : ""}`,
  });
  return NextResponse.json({ ok: true, ticket });
}

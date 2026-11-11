import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { writeAudit } from "@/lib/data/base";
import { CLAIM_STATUS_TONE } from "@/lib/types";

/** Create claim (landlord report issue / tenant raise claim). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    unitId?: string; type?: string; amountAed?: number; priority?: string; description?: string;
  };
  if (!body.unitId || !body.type || !body.description) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const count = await db.claim.count();
  const ref = `CLM-2026-${String(count + 41).padStart(4, "0")}`;
  const lease = await db.lease.findFirst({ where: { unitId: body.unitId, status: { in: ["active", "expiring_soon"] } } });
  const claim = await db.claim.create({
    data: {
      ref, unitId: body.unitId, leaseId: lease?.id ?? null, raisedById: session.sub,
      type: body.type, status: "submitted", amountAed: body.amountAed ?? 0,
      priority: body.priority ?? "medium", description: body.description,
    },
  });
  await writeAudit({
    actorId: session.sub, actorName: session.fullName, actorRole: session.role,
    action: "claim.create", entityType: "Claim", entityId: claim.id, detail: `Claim ${ref} submitted`,
  });
  return NextResponse.json({ ok: true, claim });
}

/** Update claim status (admin oversight / landlord visibility). */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, status } = (await req.json()) as { id?: string; status?: string };
  if (!id || !status || !(status in CLAIM_STATUS_TONE)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const claim = await db.claim.update({
    where: { id },
    data: { status, resolvedAt: ["settled", "rejected"].includes(status) ? new Date() : null },
  });
  await writeAudit({
    actorId: session.sub, actorName: session.fullName, actorRole: session.role,
    action: "claim.status", entityType: "Claim", entityId: id, detail: `Claim ${claim.ref} → ${status}`,
  });
  return NextResponse.json({ ok: true, claim });
}

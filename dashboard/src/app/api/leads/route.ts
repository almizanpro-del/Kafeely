import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { writeAudit } from "@/lib/data/base";
import { LEAD_STAGE_TONE } from "@/lib/types";

/** Create lead (broker/agent). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "broker" && session.role !== "agent") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    clientName?: string; clientType?: string; interest?: string; budgetAed?: number; notes?: string;
  };
  if (!body.clientName) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const lead = await db.lead.create({
    data: {
      clientName: body.clientName, clientType: body.clientType ?? "tenant",
      stage: "new", interest: body.interest ?? null, budgetAed: body.budgetAed ?? null,
      estCommissionAed: body.budgetAed ? Math.round(body.budgetAed * 0.025) : 0,
      ownerId: session.sub, notes: body.notes ?? null,
    },
  });
  return NextResponse.json({ ok: true, lead });
}

/** Move lead stage (kanban). */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, stage } = (await req.json()) as { id?: string; stage?: string };
  if (!id || !stage || !(stage in LEAD_STAGE_TONE)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const lead = await db.lead.update({ where: { id }, data: { stage } });
  await writeAudit({
    actorId: session.sub, actorName: session.fullName, actorRole: session.role,
    action: "lead.stage", entityType: "Lead", entityId: id, detail: `${lead.clientName} → ${stage}`,
  });
  return NextResponse.json({ ok: true, lead });
}

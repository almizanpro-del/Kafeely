import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Add document to vault (landlord / tenant upload — metadata only in demo). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, category, unitId, leaseId } = (await req.json()) as {
    name?: string; category?: string; unitId?: string; leaseId?: string;
  };
  if (!name || !category) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const document = await db.document.create({
    data: {
      name, category, ownerRole: session.role, ownerId: session.sub,
      unitId: unitId ?? null, leaseId: leaseId ?? null,
      sizeKb: 180 + Math.floor(Math.random() * 2400), status: "pending",
    },
  });
  return NextResponse.json({ ok: true, document });
}

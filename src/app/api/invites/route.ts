import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Send invite (landlord → tenant/broker/co-owner). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { email, role } = (await req.json()) as { email?: string; role?: string };
  if (!email || !role) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const invite = await db.invite.create({
    data: { email: email.toLowerCase().trim(), role, ownerId: session.sub, ownerName: session.fullName },
  });
  return NextResponse.json({ ok: true, invite });
}

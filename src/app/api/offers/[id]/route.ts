import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { OFFER_STATUS_TONE } from "@/lib/types";

/** Update offer status (leasing / agent negotiation tracker). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status?: string };
  if (!status || !(status in OFFER_STATUS_TONE)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const offer = await db.offer.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, offer });
}

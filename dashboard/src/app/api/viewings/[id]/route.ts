import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { VIEWING_STATUS_TONE } from "@/lib/types";

/** Update viewing status (leasing). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status?: string };
  if (!status || !(status in VIEWING_STATUS_TONE)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const viewing = await db.viewing.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, viewing });
}

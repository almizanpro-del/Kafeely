import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { APPLICATION_STATUS_TONE } from "@/lib/types";

/** Update application status (leasing inbox). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status?: string };
  if (!status || !(status in APPLICATION_STATUS_TONE)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const application = await db.application.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, application });
}

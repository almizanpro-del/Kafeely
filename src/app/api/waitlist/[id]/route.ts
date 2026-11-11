import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { writeAudit } from "@/lib/data/base";

const ACTIONS: Record<string, (id: string) => Promise<unknown>> = {
  verify: (id) => db.waitlistEntry.update({ where: { id }, data: { status: "qualified" } }),
  convert: (id) => db.waitlistEntry.update({ where: { id }, data: { status: "converted" } }),
  erase: async (id) => {
    const w = await db.waitlistEntry.findUnique({ where: { id } });
    if (!w) return null;
    return db.waitlistEntry.update({
      where: { id },
      data: {
        status: "erased",
        fullName: "—",
        email: `erased-${w.id.slice(0, 8)}@redacted.local`,
        phone: null,
        notes: "GDPR/DFSA erasure request fulfilled.",
      },
    });
  },
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { action } = (await req.json()) as { action?: string };
  const fn = action ? ACTIONS[action] : undefined;
  if (!fn) return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  const entry = await fn(id);
  if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await writeAudit({
    actorId: session.sub, actorName: session.fullName, actorRole: session.role,
    action: `waitlist.${action}`, entityType: "WaitlistEntry", entityId: id,
    detail: `Waitlist entry ${action} applied`,
  });
  return NextResponse.json({ ok: true, entry });
}

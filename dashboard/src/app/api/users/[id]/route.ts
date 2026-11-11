import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/session";
import { writeAudit } from "@/lib/data/base";
import { ROLES } from "@/lib/types";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json()) as { action?: string; role?: string };
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let tempPassword: string | null = null;
  switch (body.action) {
    case "approve":
      await db.user.update({ where: { id }, data: { status: "active" } });
      break;
    case "suspend":
      await db.user.update({ where: { id }, data: { status: "suspended" } });
      break;
    case "reactivate":
      await db.user.update({ where: { id }, data: { status: "active" } });
      break;
    case "change_role":
      if (!body.role || !ROLES.includes(body.role as never)) {
        return NextResponse.json({ error: "invalid_role" }, { status: 400 });
      }
      await db.user.update({ where: { id }, data: { role: body.role } });
      break;
    case "reset_password": {
      tempPassword = `Kf-${randomBytes(5).toString("hex")}`;
      const { scryptSync } = await import("crypto");
      const salt = randomBytes(16).toString("hex");
      await db.user.update({
        where: { id },
        data: { passwordHash: `scrypt$${salt}$${scryptSync(tempPassword, salt, 64).toString("hex")}` },
      });
      break;
    }
    default:
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  await writeAudit({
    actorId: session.sub, actorName: session.fullName, actorRole: session.role,
    action: `user.${body.action === "change_role" ? "role_change" : body.action}`,
    entityType: "User", entityId: id,
    detail: `${body.action} applied to ${user.fullName}${body.role ? ` → ${body.role}` : ""}`,
  });
  return NextResponse.json({ ok: true, tempPassword });
}

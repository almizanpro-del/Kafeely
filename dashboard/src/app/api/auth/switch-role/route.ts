import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { ROLES, type Role } from "@/lib/types";

/**
 * DEMO ONLY — instant role switching for the sandbox preview.
 * In production this endpoint is removed; roles are granted by admins.
 */
export async function POST(req: NextRequest) {
  const { role } = (await req.json()) as { role?: Role };
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  const user = await db.user.findFirst({ where: { role, status: "active" }, orderBy: { createdAt: "asc" } });
  if (!user) return NextResponse.json({ error: "no_user_for_role" }, { status: 404 });
  await createSession({
    sub: user.id, email: user.email, fullName: user.fullName,
    role: user.role as Role, avatarSeed: user.avatarSeed,
  });
  return NextResponse.json({ ok: true, role: user.role });
}

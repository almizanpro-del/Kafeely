import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scryptSync, timingSafeEqual } from "crypto";
import { createSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/types";

function verify(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !verify(password, user.passwordHash)) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    if (user.status === "suspended") {
      return NextResponse.json({ error: "suspended" }, { status: 403 });
    }
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession({
      sub: user.id, email: user.email, fullName: user.fullName,
      role: user.role as Role, avatarSeed: user.avatarSeed,
    });
    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export { ROLES };

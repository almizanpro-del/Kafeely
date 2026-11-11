import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Broadcast announcement (facility management). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { title, body, propertyId, audience, priority } = (await req.json()) as {
    title?: string; body?: string; propertyId?: string | null; audience?: string; priority?: string;
  };
  if (!title || !body) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const announcement = await db.announcement.create({
    data: {
      title, body, propertyId: propertyId || null,
      audience: audience ?? "all", priority: priority ?? "normal", sentById: session.sub,
    },
  });
  return NextResponse.json({ ok: true, announcement });
}

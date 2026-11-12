import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Delete a document from the vault (owner or super admin only). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (doc.ownerId !== session.sub && session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

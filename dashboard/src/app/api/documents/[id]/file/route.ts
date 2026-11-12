import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Serve the stored file of a document (inline for view/print, attachment for download). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  // Visibility mirrors the data layer: own documents, landlord-of-unit, tenant-on-lease; super admin sees all.
  const doc =
    session.role === "super_admin"
      ? await db.document.findUnique({ where: { id } })
      : await db.document.findFirst({
          where: {
            id,
            OR: [
              { ownerId: session.sub },
              { unit: { landlordId: session.sub } },
              { lease: { tenantId: session.sub } },
            ],
          },
        });

  if (!doc || !doc.fileData) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const bytes = Buffer.isBuffer(doc.fileData) ? doc.fileData : Buffer.from(doc.fileData);
  const safeName = (doc.fileName ?? doc.name).replace(/[^\w.\-() ]/g, "_").replace(/"/g, "") || "document";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

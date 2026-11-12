import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file

/**
 * Upload a real file into the document vault (multipart/form-data).
 * Fields: file (required), name?, category?, unitId?, leaseId?
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const rawName = (form.get("name") as string | null)?.trim();
  const category = ((form.get("category") as string | null) ?? "other").trim();
  const unitId = (form.get("unitId") as string | null) || undefined;
  const leaseId = (form.get("leaseId") as string | null) || undefined;

  const name = rawName || file.name || "Untitled document";
  const fileName = file.name || name;
  const mimeType = file.type || "application/octet-stream";

  const bytes = Buffer.from(await file.arrayBuffer());
  const document = await db.document.create({
    data: {
      name,
      category,
      ownerRole: session.role,
      ownerId: session.sub,
      unitId: unitId ?? null,
      leaseId: leaseId ?? null,
      fileName,
      mimeType,
      fileData: bytes,
      sizeKb: Math.max(1, Math.round(bytes.length / 1024)),
      status: "pending",
    },
    select: { id: true, name: true, sizeKb: true, status: true },
  });

  return NextResponse.json({ ok: true, document });
}

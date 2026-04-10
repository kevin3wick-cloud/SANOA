import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { DocumentKind, DocumentVisibility } from "@prisma/client";
import { db } from "@/lib/db";
import { putObject } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

function isPdfMagic(buffer: Buffer) {
  return buffer.subarray(0, 4).toString("latin1") === "%PDF";
}

function parseVisibility(value: FormDataEntryValue | null): DocumentVisibility | null {
  if (value === DocumentVisibility.INTERNAL || value === DocumentVisibility.TENANT_VISIBLE) {
    return value;
  }
  if (typeof value === "string") {
    if (value === "INTERNAL") return DocumentVisibility.INTERNAL;
    if (value === "TENANT_VISIBLE") return DocumentVisibility.TENANT_VISIBLE;
  }
  return null;
}

function parseDocumentKind(value: FormDataEntryValue | null): DocumentKind {
  if (typeof value === "string" && (Object.values(DocumentKind) as string[]).includes(value)) {
    return value as DocumentKind;
  }
  return DocumentKind.SONSTIGES;
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ungültige Formulardaten." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Bitte eine PDF-Datei auswählen." },
      { status: 400 }
    );
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Nur PDF-Dateien sind erlaubt." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Die Datei ist zu groß (maximal 10 MB)." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!isPdfMagic(buffer)) {
    return NextResponse.json(
      { error: "Die Datei ist keine gültige PDF-Datei." },
      { status: 400 }
    );
  }

  const displayNameRaw = formData.get("name");
  const displayName =
    typeof displayNameRaw === "string" && displayNameRaw.trim().length > 0
      ? displayNameRaw.trim()
      : file.name.replace(/\.pdf$/i, "").trim() || "Dokument";

  const visibilityRaw = parseVisibility(formData.get("visibility"));
  if (!visibilityRaw) {
    return NextResponse.json({ error: "Ungültige Sichtbarkeit." }, { status: 400 });
  }

  const tenantRaw = formData.get("tenantId");
  let tenantId: string | null = null;
  if (typeof tenantRaw === "string" && tenantRaw.trim().length > 0) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantRaw.trim() } });
    if (!tenant) {
      return NextResponse.json({ error: "Mieter nicht gefunden." }, { status: 400 });
    }
    tenantId = tenant.id;
  }

  const kind = parseDocumentKind(formData.get("kind"));

  // Upload to Cloudflare R2
  const r2Key = `docs/${randomUUID()}.pdf`;
  try {
    await putObject(r2Key, buffer, "application/pdf");
  } catch (err) {
    console.error("R2 upload error:", err);
    return NextResponse.json(
      { error: "Datei konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }

  const originalFilename = file.name.replace(/[/\\]/g, "_").slice(0, 255);

  // Store the R2 key as fileUrl (proxy route resolves it)
  const doc = await db.document.create({
    data: {
      name: displayName.slice(0, 255),
      originalFilename,
      fileUrl: r2Key,   // R2 object key, not a public URL
      visibility: visibilityRaw,
      kind,
      tenantId
    }
  });

  if (visibilityRaw === DocumentVisibility.TENANT_VISIBLE) {
    const now = new Date();
    await db.document.updateMany({
      where: {
        id: { not: doc.id },
        visibility: DocumentVisibility.TENANT_VISIBLE,
        kind,
        tenantId,
        archivedAt: null
      },
      data: { archivedAt: now }
    });
  }

  return NextResponse.json(
    { id: doc.id, fileUrl: `/api/documents/${doc.id}/file` },
    { status: 201 }
  );
}

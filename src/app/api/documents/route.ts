import { NextRequest, NextResponse } from "next/server";
import { DocumentVisibility } from "@prisma/client";
import { db } from "@/lib/db";

type DocumentBody = {
  name?: string;
  fileUrl?: string;
  visibility?: DocumentVisibility;
  tenantId?: string | null;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DocumentBody;

  if (!body.name || !body.fileUrl) {
    return NextResponse.json(
      { error: "Name und Dateipfad sind erforderlich" },
      { status: 400 }
    );
  }

  const visibility = body.visibility ?? DocumentVisibility.INTERNAL;
  if (!Object.values(DocumentVisibility).includes(visibility)) {
    return NextResponse.json({ error: "Ungültige Sichtbarkeit" }, { status: 400 });
  }

  await db.document.create({
    data: {
      name: body.name.trim(),
      fileUrl: body.fileUrl.trim(),
      visibility,
      tenantId: body.tenantId ?? null
    }
  });

  return NextResponse.json({ ok: true });
}

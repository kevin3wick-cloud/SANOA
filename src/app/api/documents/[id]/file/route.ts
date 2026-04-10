import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Dokument nicht gefunden." }, { status: 404 });
  }

  // fileUrl contains the R2 object key (e.g. "docs/uuid.pdf")
  const r2Key = doc.fileUrl;

  // Generate a pre-signed URL valid for 1 hour
  let signedUrl: string;
  try {
    signedUrl = getPresignedUrl(r2Key, 3600);
  } catch (err) {
    console.error("R2 pre-sign error:", err);
    return NextResponse.json(
      { error: "Datei konnte nicht abgerufen werden." },
      { status: 500 }
    );
  }

  // Redirect browser to the temporary R2 URL
  return NextResponse.redirect(signedUrl, { status: 302 });
}

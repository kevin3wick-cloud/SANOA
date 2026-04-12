import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { getMieterSessionUser } from "@/lib/tenant-auth";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { imageUrl: true, tenantId: true }
  });

  if (!ticket?.imageUrl) {
    return NextResponse.json({ error: "Kein Bild vorhanden." }, { status: 404 });
  }

  // Auth: landlord session OR the tenant who owns the ticket
  const landlord = await getLandlordSessionUser();
  if (!landlord) {
    const mieter = await getMieterSessionUser();
    if (!mieter?.tenant || mieter.tenant.id !== ticket.tenantId) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
  }

  // Parse "data:<mimeType>;base64,<data>"
  const match = ticket.imageUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    return NextResponse.json({ error: "Ungültiges Bildformat." }, { status: 500 });
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=3600"
    }
  });
}

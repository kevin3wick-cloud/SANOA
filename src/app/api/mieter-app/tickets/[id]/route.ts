import { NextRequest, NextResponse } from "next/server";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await db.ticket.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, status: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  if (ticket.status !== "OPEN") {
    return NextResponse.json(
      { error: "Nur offene Tickets können bearbeitet werden." },
      { status: 400 }
    );
  }

  let body: { description?: string };
  try {
    body = (await request.json()) as { description?: string };
  } catch {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : null;

  if (!description || description.length < 3) {
    return NextResponse.json(
      { error: "Beschreibung muss mindestens 3 Zeichen haben." },
      { status: 400 }
    );
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: { description },
  });

  return NextResponse.json({ ok: true });
}

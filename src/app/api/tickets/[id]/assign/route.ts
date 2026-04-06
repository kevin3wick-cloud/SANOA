import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

type Body = { assignedToId: string | null };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getLandlordSessionUser();
  if (!currentUser || currentUser.role === "MIETER") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as Body;
  const { assignedToId } = body;

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  // Validate assignee exists and is a LANDLORD user
  if (assignedToId !== null) {
    const assignee = await db.user.findUnique({ where: { id: assignedToId } });
    if (!assignee || assignee.role !== "LANDLORD") {
      return NextResponse.json({ error: "Ungültiger Benutzer." }, { status: 400 });
    }
  }

  await db.ticket.update({
    where: { id },
    data: { assignedToId: assignedToId ?? null },
  });

  return NextResponse.json({ ok: true });
}

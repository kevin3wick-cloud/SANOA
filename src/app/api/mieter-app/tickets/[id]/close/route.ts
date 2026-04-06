import { NextRequest, NextResponse } from "next/server";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await db.ticket.findFirst({
    where: { id, tenantId: user.tenantId }
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  if (ticket.status === "DONE") {
    return NextResponse.json({ error: "Ticket ist bereits erledigt." }, { status: 400 });
  }

  let comment = "";
  try {
    const body = (await request.json()) as { comment?: string };
    comment = typeof body.comment === "string" ? body.comment.trim() : "";
  } catch {
    // no body is fine
  }

  // Update ticket status to DONE
  await db.ticket.update({
    where: { id: ticket.id },
    data: { status: "DONE" }
  });

  // Add a visible note if the Mieter left a comment
  if (comment.length > 0) {
    await db.ticketNote.create({
      data: {
        ticketId: ticket.id,
        text: `Mieter hat das Ticket als erledigt markiert: ${comment}`,
        isInternal: false,
        isTenantAuthor: true
      }
    });
  } else {
    await db.ticketNote.create({
      data: {
        ticketId: ticket.id,
        text: "Mieter hat das Ticket als erledigt markiert.",
        isInternal: false,
        isTenantAuthor: true
      }
    });
  }

  return NextResponse.json({ ok: true });
}

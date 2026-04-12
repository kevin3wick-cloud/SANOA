import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToTenant } from "@/lib/push";

export const runtime = "nodejs";

type NoteBody = {
  text?: string;
  isInternal?: boolean;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as NoteBody;

  if (!body.text || body.text.trim().length < 2) {
    return NextResponse.json(
      { error: "Text für Notiz zu kurz" },
      { status: 400 }
    );
  }

  const isInternal = body.isInternal ?? true;

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { tenantId: true, title: true }
  });

  await db.ticketNote.create({
    data: {
      ticketId: id,
      text: body.text.trim(),
      isInternal
    }
  });

  // Push notification to tenant when landlord sends a visible message
  if (!isInternal && ticket?.tenantId) {
    sendPushToTenant(ticket.tenantId, {
      title: "Neue Nachricht",
      body: `Verwaltung: ${body.text.trim().slice(0, 80)}`,
      url: `/mieter-app/tickets/${id}`
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

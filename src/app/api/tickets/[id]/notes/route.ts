import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToTenant } from "@/lib/push";
import { sendEmail, newMessageEmail } from "@/lib/email";

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
    select: { tenantId: true, title: true, tenant: { select: { name: true, email: true } } }
  });

  await db.ticketNote.create({
    data: {
      ticketId: id,
      text: body.text.trim(),
      isInternal
    }
  });

  // Notify tenant when landlord sends a visible (non-internal) message
  if (!isInternal && ticket?.tenantId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://sanoa-production.up.railway.app";
    const ticketUrl = `${baseUrl}/mieter-app/tickets/${id}`;

    sendPushToTenant(ticket.tenantId, {
      title: "Neue Nachricht",
      body: `Verwaltung: ${body.text.trim().slice(0, 80)}`,
      url: `/mieter-app/tickets/${id}`
    }).catch(() => {});

    if (ticket.tenant?.email) {
      sendEmail(newMessageEmail({
        tenantName: ticket.tenant.name,
        tenantEmail: ticket.tenant.email,
        ticketTitle: ticket.title,
        messagePreview: body.text.trim().slice(0, 300),
        ticketUrl
      })).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}

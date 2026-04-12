import { NextRequest, NextResponse } from "next/server";
import { AppointmentProposalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { sendPushToTenant } from "@/lib/push";
import { sendEmail, newAppointmentEmail } from "@/lib/email";

export const runtime = "nodejs";

type Body = {
  message?: string;
  startAt?: string;
  endAt?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const body = (await request.json()) as Body;
  const message = body.message?.trim();
  const startAt = body.startAt ? new Date(body.startAt) : null;
  const endAt = body.endAt ? new Date(body.endAt) : (startAt ? new Date(startAt.getTime() + 60 * 60 * 1000) : null);

  if (!message || message.length < 3) {
    return NextResponse.json(
      { error: "Bitte einen Terminvorschlag mit mindestens 3 Zeichen eingeben." },
      { status: 400 }
    );
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: { tenant: { select: { name: true, email: true } } }
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.ticketAppointmentProposal.updateMany({
      where: {
        ticketId,
        status: AppointmentProposalStatus.PENDING
      },
      data: {
        status: AppointmentProposalStatus.WITHDRAWN,
        respondedAt: new Date()
      }
    });
    await tx.ticketAppointmentProposal.create({
      data: {
        ticketId,
        message: message.slice(0, 2000),
        ...(startAt && { startAt, endAt })
      }
    });
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://sanoa-production.up.railway.app";
  const ticketUrl = `${baseUrl}/mieter-app/tickets/${ticketId}`;

  sendPushToTenant(ticket.tenantId, {
    title: "Neuer Terminvorschlag",
    body: message.slice(0, 100),
    url: `/mieter-app/tickets/${ticketId}`
  }).catch(() => {});

  if (ticket.tenant?.email) {
    sendEmail(newAppointmentEmail({
      tenantName: ticket.tenant.name,
      tenantEmail: ticket.tenant.email,
      ticketTitle: ticket.title,
      message: message.slice(0, 300),
      ticketUrl
    })).catch(() => {});
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

/**
 * Public API — Contractor submits an appointment proposal via the link in their email.
 * No authentication required (ticketId acts as a hard-to-guess token).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ ticketId: string }> };

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { ticketId } = await params;

  const ticket = await (db as any).ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      title: true,
      category: true,
      tenant: { select: { apartment: true } },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { ticketId } = await params;

  const ticket = await (db as any).ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, title: true },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });

  const body = await req.json();
  const { date, time, message } = body as { date?: string; time?: string; message?: string };

  if (!date) return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });

  // Parse date (YYYY-MM-DD from input[type=date]) + optional time (HH:MM)
  let startAt: Date | null = null;
  try {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time ? time.split(":").map(Number) : [10, 0];
    startAt = new Date(year, month - 1, day, hour ?? 10, minute ?? 0);
  } catch { /* leave null */ }

  // Format a human-readable date string for the proposal message
  const dateLabel = startAt
    ? startAt.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
    : date;
  const timeLabel = time ?? "";
  const autoMessage = `Terminvorschlag: ${dateLabel}${timeLabel ? ` um ${timeLabel} Uhr` : ""}${message ? `\n\n${message}` : ""}`;

  await (db as any).ticketAppointmentProposal.create({
    data: {
      ticketId,
      message: autoMessage,
      startAt,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

type Body = {
  text?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id: ticketId } = await params;
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { tenantId: true }
  });

  if (!ticket || ticket.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  const body = (await request.json()) as Body;
  const text = body.text?.trim() ?? "";
  if (text.length < 2) {
    return NextResponse.json({ error: "Nachricht zu kurz." }, { status: 400 });
  }

  await db.ticketNote.create({
    data: {
      ticketId,
      text,
      isInternal: false,
      isTenantAuthor: true
    }
  });

  return NextResponse.json({ ok: true });
}

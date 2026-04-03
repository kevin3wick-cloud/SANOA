import { NextRequest, NextResponse } from "next/server";
import { TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";

type StatusBody = {
  status?: TicketStatus;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as StatusBody;

  if (!body.status || !Object.values(TicketStatus).includes(body.status)) {
    return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  }

  await db.ticket.update({
    where: { id },
    data: { status: body.status }
  });

  return NextResponse.json({ ok: true });
}

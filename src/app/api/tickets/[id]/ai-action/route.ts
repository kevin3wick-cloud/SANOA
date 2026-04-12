import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";
import { suggestTicketAction } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getLandlordSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      category: true,
      location: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  const action = await suggestTicketAction(
    ticket.title,
    ticket.description,
    ticket.category,
    ticket.location
  );

  return NextResponse.json({ action: action || null });
}

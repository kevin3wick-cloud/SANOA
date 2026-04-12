import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";
import { suggestLandlordReply } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(
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
    include: {
      notes: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        select: { text: true, isTenantAuthor: true },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  const suggestion = await suggestLandlordReply(
    ticket.title,
    ticket.description,
    ticket.notes
  );

  if (!suggestion) {
    return NextResponse.json(
      { error: "KI nicht verfügbar. Bitte ANTHROPIC_API_KEY prüfen." },
      { status: 503 }
    );
  }

  return NextResponse.json({ suggestion });
}

import { NextRequest, NextResponse } from "next/server";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getMieterSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await request.json()) as {
    newName?: string;
    reason?: string;
  };

  const newName = body.newName?.trim();
  if (!newName || newName.length < 2) {
    return NextResponse.json(
      { error: "Bitte geben Sie einen gültigen Namen ein (min. 2 Zeichen)." },
      { status: 400 }
    );
  }
  if (newName.length > 80) {
    return NextResponse.json(
      { error: "Name darf maximal 80 Zeichen lang sein." },
      { status: 400 }
    );
  }

  const oldName = user.name;

  // Update user name and tenant name in one transaction
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { name: newName },
    }),
    db.tenant.update({
      where: { id: user.tenantId! },
      data: { name: newName },
    }),
  ]);

  // Create an internal note on the most recent ticket so the landlord sees the change
  const latestTicket = await db.ticket.findFirst({
    where: { tenantId: user.tenantId! },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (latestTicket) {
    const reasonNote = body.reason?.trim() ? ` Grund: ${body.reason.trim()}` : "";
    await db.ticketNote.create({
      data: {
        ticketId: latestTicket.id,
        text: `ℹ️ Namensänderung: «${oldName}» → «${newName}».${reasonNote}`,
        isInternal: true,
        isTenantAuthor: false,
      },
    });
  }

  return NextResponse.json({ ok: true, newName });
}

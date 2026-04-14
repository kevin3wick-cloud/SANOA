// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

// POST — transfer all open tickets from one person to another
export async function POST(req: NextRequest) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await req.json();
  const fromUserId = body.fromUserId?.trim();
  const toUserId = body.toUserId?.trim();

  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "fromUserId und toUserId erforderlich." }, { status: 400 });
  }
  if (fromUserId === toUserId) {
    return NextResponse.json({ error: "Quelle und Ziel sind identisch." }, { status: 400 });
  }

  const orgId = user.orgId ?? null;

  // Transfer all non-DONE tickets assigned to fromUser within this org
  const result = await db.ticket.updateMany({
    where: {
      assignedToId: fromUserId,
      status: { not: "DONE" },
      ...(orgId ? { orgId } : {}),
    },
    data: { assignedToId: toUserId },
  });

  return NextResponse.json({ ok: true, transferred: result.count });
}

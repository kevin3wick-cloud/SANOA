import { NextResponse } from "next/server";
import { hasUnreadFromLandlordForTenant } from "@/lib/ticket-chat-read";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rows = await db.ticket.findMany({
    where: { tenantId: user.tenantId },
    include: {
      notes: {
        where: { isInternal: false },
        select: { createdAt: true, isTenantAuthor: true }
      },
      appointmentProposals: {
        select: { status: true, createdAt: true, respondedAt: true }
      }
    }
  });

  const count = rows.filter((row) =>
    hasUnreadFromLandlordForTenant(
      {
        createdAt: row.createdAt,
        tenantLastSeenChatAt: row.tenantLastSeenChatAt,
        tenantLastSeenAppointmentsAt: row.tenantLastSeenAppointmentsAt,
        notes: row.notes.map((n) => ({
          createdAt: n.createdAt,
          isInternal: false as const,
          isTenantAuthor: n.isTenantAuthor
        }))
      },
      row.appointmentProposals
    )
  ).length;

  return NextResponse.json({ count });
}

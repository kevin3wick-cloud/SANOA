import { NextResponse } from "next/server";
import { hasUnreadFromTenantForLandlord } from "@/lib/ticket-chat-read";
import { db } from "@/lib/db";

export async function GET() {
  const rows = await db.ticket.findMany({
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
    hasUnreadFromTenantForLandlord(
      {
        createdAt: row.createdAt,
        landlordLastSeenChatAt: row.landlordLastSeenChatAt,
        landlordLastSeenAppointmentsAt: row.landlordLastSeenAppointmentsAt,
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

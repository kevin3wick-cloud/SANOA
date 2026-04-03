import type {
  AppointmentProposalStatus,
  Prisma,
  Tenant,
  Ticket
} from "@prisma/client";
import { hasUnreadFromTenantForLandlord } from "@/lib/ticket-chat-read";

const chatNotesInclude = {
  notes: {
    where: { isInternal: false },
    select: { createdAt: true, isTenantAuthor: true }
  },
  appointmentProposals: {
    select: { status: true, createdAt: true, respondedAt: true }
  }
} satisfies Prisma.TicketInclude;

export type TicketBoardInclude = typeof chatNotesInclude;

export type TicketWithTenantAndUnread = Ticket & {
  tenant: Tenant;
  unreadFromTenant: boolean;
};

export function annotateTicketsForLandlordBoard<
  T extends Ticket & {
    tenant: Tenant;
    notes: { createdAt: Date; isTenantAuthor: boolean }[];
    appointmentProposals: {
      status: AppointmentProposalStatus;
      createdAt: Date;
      respondedAt: Date | null;
    }[];
  }
>(rows: T[]): TicketWithTenantAndUnread[] {
  return rows.map((row) => {
    const { notes, appointmentProposals, ...rest } = row;
    const unreadFromTenant = hasUnreadFromTenantForLandlord(
      {
        createdAt: row.createdAt,
        landlordLastSeenChatAt: row.landlordLastSeenChatAt,
        landlordLastSeenAppointmentsAt: row.landlordLastSeenAppointmentsAt,
        notes: notes.map((n) => ({
          createdAt: n.createdAt,
          isInternal: false as const,
          isTenantAuthor: n.isTenantAuthor
        }))
      },
      appointmentProposals
    );
    return { ...rest, unreadFromTenant };
  });
}

export { chatNotesInclude };

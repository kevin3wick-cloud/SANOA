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
  },
  assignedTo: {
    select: { id: true, name: true }
  }
} satisfies Prisma.TicketInclude;

export type TicketBoardInclude = typeof chatNotesInclude;

export type TicketWithTenantAndUnread = Ticket & {
  tenant: Tenant;
  unreadFromTenant: boolean;
  assignedTo: { id: string; name: string } | null;
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
    const { notes, appointmentProposals, assignedTo, ...rest } = row as T & { assignedTo?: { id: string; name: string } | null };
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
    return { ...rest, unreadFromTenant, assignedTo: assignedTo ?? null };
  });
}

export { chatNotesInclude };

import type { AppointmentProposalStatus } from "@prisma/client";

type PublicNote = {
  createdAt: Date;
  isInternal: boolean;
  isTenantAuthor: boolean;
};

type TicketChatBaseline = {
  createdAt: Date;
  notes: PublicNote[];
};

type ProposalForUnread = {
  status: AppointmentProposalStatus;
  createdAt: Date;
  respondedAt: Date | null;
};

/** Mieter: ungelesene Nachricht der Verwaltung (öffentliche Notiz, nicht vom Mieter). */
export function hasUnreadLandlordMessageForTenant(
  ticket: TicketChatBaseline & { tenantLastSeenChatAt: Date | null }
): boolean {
  const baseline = ticket.tenantLastSeenChatAt ?? ticket.createdAt;
  return ticket.notes.some(
    (n) => !n.isInternal && !n.isTenantAuthor && n.createdAt > baseline
  );
}

/** Vermieter: ungelesene Nachricht des Mieters (öffentliche Notiz mit isTenantAuthor). */
export function hasUnreadTenantMessageForLandlord(
  ticket: TicketChatBaseline & { landlordLastSeenChatAt: Date | null }
): boolean {
  const baseline = ticket.landlordLastSeenChatAt ?? ticket.createdAt;
  return ticket.notes.some(
    (n) => !n.isInternal && n.isTenantAuthor && n.createdAt > baseline
  );
}

/** Mieter: offener Terminvorschlag der Verwaltung, den der Mieter noch nicht „gesehen“ hat. */
export function hasUnreadPendingAppointmentForTenant(
  ticket: { createdAt: Date; tenantLastSeenAppointmentsAt: Date | null },
  proposals: ProposalForUnread[]
): boolean {
  const baseline = ticket.tenantLastSeenAppointmentsAt ?? ticket.createdAt;
  return proposals.some(
    (p) => p.status === "PENDING" && p.createdAt > baseline
  );
}

/** Vermieter: vom Mieter bestätigter oder abgelehnter Terminvorschlag, noch nicht eingesehen. */
export function hasUnreadAppointmentResponseForLandlord(
  ticket: { createdAt: Date; landlordLastSeenAppointmentsAt: Date | null },
  proposals: ProposalForUnread[]
): boolean {
  const baseline = ticket.landlordLastSeenAppointmentsAt ?? ticket.createdAt;
  return proposals.some(
    (p) =>
      (p.status === "CONFIRMED" || p.status === "REJECTED") &&
      p.respondedAt != null &&
      p.respondedAt > baseline
  );
}

/** Mieter: Chat oder Terminvorschlag von der Verwaltung. */
export function hasUnreadFromLandlordForTenant(
  ticket: TicketChatBaseline & {
    tenantLastSeenChatAt: Date | null;
    tenantLastSeenAppointmentsAt: Date | null;
  },
  proposals: ProposalForUnread[]
): boolean {
  return (
    hasUnreadLandlordMessageForTenant(ticket) ||
    hasUnreadPendingAppointmentForTenant(ticket, proposals)
  );
}

/** Vermieter: Chat vom Mieter oder Antwort auf Terminvorschlag. */
export function hasUnreadFromTenantForLandlord(
  ticket: TicketChatBaseline & {
    landlordLastSeenChatAt: Date | null;
    landlordLastSeenAppointmentsAt: Date | null;
  },
  proposals: ProposalForUnread[]
): boolean {
  return (
    hasUnreadTenantMessageForLandlord(ticket) ||
    hasUnreadAppointmentResponseForLandlord(ticket, proposals)
  );
}

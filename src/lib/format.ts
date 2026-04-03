import {
  AppointmentProposalStatus,
  DocumentKind,
  TicketCategory,
  TicketStatus
} from "@prisma/client";

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatStatus(status: TicketStatus) {
  const map: Record<TicketStatus, string> = {
    OPEN: "Offen",
    IN_PROGRESS: "In Bearbeitung",
    DONE: "Erledigt"
  };
  return map[status];
}

export function getStatusBadgeClassName(status: TicketStatus) {
  if (status === "OPEN") return "status-badge status-open";
  if (status === "IN_PROGRESS") return "status-badge status-progress";
  return "status-badge status-done";
}

export function formatCategory(category: TicketCategory) {
  const map: Record<TicketCategory, string> = {
    SANITAER: "Sanitär",
    HEIZUNG: "Heizung",
    ELEKTRO: "Elektro",
    FENSTER_TUEREN: "Fenster / Türen",
    ALLGEMEIN: "Allgemein",
    SONSTIGES: "Sonstiges"
  };
  return map[category];
}

export function formatAppointmentProposalStatus(status: AppointmentProposalStatus) {
  const map: Record<AppointmentProposalStatus, string> = {
    PENDING: "Ausstehend",
    CONFIRMED: "Bestätigt",
    REJECTED: "Abgelehnt",
    WITHDRAWN: "Ersetzt"
  };
  return map[status];
}

export function formatDocumentKind(kind: DocumentKind) {
  const map: Record<DocumentKind, string> = {
    MIETVERTRAG: "Mietvertrag",
    HAUSORDNUNG: "Hausordnung",
    NEBENKOSTEN: "Nebenkostenabrechnung",
    MITTEILUNG: "Mitteilung",
    SONSTIGES: "Sonstiges"
  };
  return map[kind];
}

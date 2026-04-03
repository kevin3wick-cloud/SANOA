import { TicketCategory } from "@prisma/client";

export const MIETER_TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "SANITAER", label: "Sanitär" },
  { value: "HEIZUNG", label: "Heizung" },
  { value: "ELEKTRO", label: "Elektro" },
  { value: "FENSTER_TUEREN", label: "Fenster / Türen" },
  { value: "ALLGEMEIN", label: "Allgemein" },
  { value: "SONSTIGES", label: "Sonstiges" }
];

export const MIETER_TICKET_LOCATIONS: { value: string; label: string }[] = [
  { value: "Bad", label: "Bad" },
  { value: "Küche", label: "Küche" },
  { value: "Wohnzimmer", label: "Wohnzimmer" },
  { value: "Schlafzimmer", label: "Schlafzimmer" },
  { value: "Keller", label: "Keller" },
  { value: "Gemeinschaftsraum", label: "Gemeinschaftsraum" },
  { value: "Sonstiges", label: "Sonstiges" }
];

export function isTicketCategory(value: string): value is TicketCategory {
  return Object.values(TicketCategory).includes(value as TicketCategory);
}

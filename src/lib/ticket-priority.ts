import { TicketCategory, TicketStatus } from "@prisma/client";

export type TicketPriorityLevel = "normal" | "dringend";

export function getTicketPriority(
  category: TicketCategory,
  status: TicketStatus,
  isUrgent?: boolean
): TicketPriorityLevel {
  if (isUrgent) return "dringend";
  if (category === "HEIZUNG" && status !== "DONE") {
    return "dringend";
  }
  return "normal";
}

export function formatPriorityLabel(level: TicketPriorityLevel) {
  return level === "dringend" ? "Dringend" : "Normal";
}

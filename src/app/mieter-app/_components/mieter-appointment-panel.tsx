"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentProposalStatus } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { CalendarPlus } from "lucide-react";

function generateICS(message: string, ticketTitle: string, respondedAt: string | null): string {
  const now = new Date();
  const eventDate = respondedAt ? new Date(respondedAt) : now;
  // Use the next occurrence of the date as the event day (fallback: +1 day from confirmation)
  const start = eventDate;
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

  function pad(n: number) {
    return String(n).padStart(2, "0");
  }
  function toICSDate(d: Date) {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
  const stamp = toICSDate(now);
  const uid = `sanoa-${Date.now()}@sanoa.tech`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sanoa//Vermieter-Portal//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}Z`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:Handwerker-Termin: ${ticketTitle}`,
    `DESCRIPTION:${message.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function AddToCalendarButton({
  message,
  ticketTitle,
  respondedAt,
}: {
  message: string;
  ticketTitle: string;
  respondedAt: string | null;
}) {
  function handleClick() {
    const ics = generateICS(message, ticketTitle, respondedAt);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "handwerker-termin.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px" }}
    >
      <CalendarPlus size={13} strokeWidth={1.75} aria-hidden />
      Zum Kalender hinzufügen
    </button>
  );
}

type Props = {
  ticketId: string;
  ticketTitle: string;
  pendingProposal: {
    id: string;
    message: string;
    createdAt: string;
  } | null;
  history: {
    id: string;
    message: string;
    status: AppointmentProposalStatus;
    createdAt: string;
    respondedAt: string | null;
  }[];
};

const statusLabel: Record<AppointmentProposalStatus, string> = {
  PENDING: "Ausstehend",
  CONFIRMED: "Bestätigt",
  REJECTED: "Abgelehnt",
  WITHDRAWN: "Ersetzt"
};

export function MieterAppointmentPanel({
  ticketId,
  ticketTitle,
  pendingProposal,
  history
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(proposalId: string, decision: "confirm" | "reject") {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/mieter-app/tickets/${ticketId}/appointment-proposals/${proposalId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision })
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Aktion fehlgeschlagen.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Terminvorschlag der Verwaltung</h3>
      {pendingProposal ? (
        <div className="stack">
          <p style={{ margin: 0, fontSize: 14 }}>
            <span className="muted">Vorschlag vom {formatDate(new Date(pendingProposal.createdAt))}:</span>
          </p>
          <p style={{ margin: 0 }}>{pendingProposal.message}</p>
          <div className="inline-action-buttons">
            <button
              type="button"
              className="btn-inline"
              disabled={busy}
              onClick={() => respond(pendingProposal.id, "confirm")}
            >
              Bestätigen
            </button>
            <button
              type="button"
              className="secondary-button btn-inline"
              disabled={busy}
              onClick={() => respond(pendingProposal.id, "reject")}
            >
              Ablehnen
            </button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Aktuell liegt kein offener Terminvorschlag vor.
        </p>
      )}
      {error && <p className="muted">{error}</p>}
      {history.filter((h) => h.status !== "PENDING").length > 0 && (
        <div className="muted" style={{ fontSize: 13 }}>
          <p style={{ margin: "8px 0 4px", fontWeight: 600 }}>Frühere Vorschläge</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {history
              .filter((h) => h.status !== "PENDING")
              .map((h) => (
                <li key={h.id} style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: h.status === "CONFIRMED" ? 600 : undefined }}>
                    {statusLabel[h.status]}:
                  </span>{" "}
                  {h.message}
                  {h.status === "CONFIRMED" && (
                    <div style={{ marginTop: 4 }}>
                      <AddToCalendarButton
                        message={h.message}
                        ticketTitle={ticketTitle}
                        respondedAt={h.respondedAt}
                      />
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

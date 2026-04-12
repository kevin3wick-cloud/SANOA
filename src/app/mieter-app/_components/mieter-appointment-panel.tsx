"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentProposalStatus } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { CalendarPlus, X } from "lucide-react";

// ── ICS helper ────────────────────────────────────────────────────────────────

function generateICS(message: string, ticketTitle: string, startAt: string | null, endAt: string | null): string {
  const now = new Date();
  const start = startAt ? new Date(startAt) : now;
  const end = endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toICSDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sanoa//Vermieter-Portal//DE",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:sanoa-${Date.now()}@sanoa.tech`, `DTSTAMP:${toICSDate(now)}Z`,
    `DTSTART:${toICSDate(start)}`, `DTEND:${toICSDate(end)}`,
    `SUMMARY:Handwerker-Termin: ${ticketTitle}`,
    `DESCRIPTION:${message.replace(/\n/g, "\\n")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function AddToCalendarButton({ message, ticketTitle, startAt, endAt }: {
  message: string; ticketTitle: string; startAt: string | null; endAt: string | null;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const ics = generateICS(message, ticketTitle, startAt, endAt);
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "handwerker-termin.ics";
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      }}
      style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px" }}
    >
      <CalendarPlus size={13} strokeWidth={1.75} aria-hidden />
      Zum Kalender hinzufügen
    </button>
  );
}

// ── Availability calendar ─────────────────────────────────────────────────────

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type DaySlots = { vormittag: boolean; nachmittag: boolean };
type SelectionMap = Record<string, DaySlots>; // key = "YYYY-MM-DD"

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDays(): Date[] {
  const days: Date[] = [];
  const start = new Date();
  start.setDate(start.getDate() + 1); // from tomorrow
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatAvailabilityMessage(selection: SelectionMap): string {
  const lines = Object.entries(selection)
    .filter(([, s]) => s.vormittag || s.nachmittag)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, s]) => {
      const d = new Date(key + "T12:00:00");
      const label = `${WEEKDAYS[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
      const times = [s.vormittag ? "Vormittag" : "", s.nachmittag ? "Nachmittag" : ""]
        .filter(Boolean).join(" oder ");
      return `• ${label}: ${times}`;
    });

  if (lines.length === 0) return "Der Termin passt mir leider nicht.";
  return `Der vorgeschlagene Termin passt mir leider nicht. Ich wäre an folgenden Terminen verfügbar:\n\n${lines.join("\n")}`;
}

function AvailabilityCalendar({
  onSubmit, onCancel, busy,
}: {
  onSubmit: (msg: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const days = buildDays();
  const [selection, setSelection] = useState<SelectionMap>({});

  // Find the weekday index of the first day (0=Mon … 6=Sun)
  const firstDow = (days[0].getDay() + 6) % 7;

  function toggleDay(d: Date) {
    const k = dateKey(d);
    setSelection((prev) => {
      if (prev[k]) {
        const next = { ...prev };
        delete next[k];
        return next;
      }
      return { ...prev, [k]: { vormittag: true, nachmittag: false } };
    });
  }

  function toggleSlot(d: Date, slot: "vormittag" | "nachmittag") {
    const k = dateKey(d);
    setSelection((prev) => {
      const cur = prev[k] ?? { vormittag: false, nachmittag: false };
      const updated = { ...cur, [slot]: !cur[slot] };
      // deselect day if both slots off
      if (!updated.vormittag && !updated.nachmittag) {
        const next = { ...prev };
        delete next[k];
        return next;
      }
      return { ...prev, [k]: updated };
    });
  }

  const selectedCount = Object.values(selection).filter((s) => s.vormittag || s.nachmittag).length;

  return (
    <div style={{
      borderRadius: 14, border: "1px solid var(--border)",
      background: "var(--surface)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Wann haben Sie Zeit?</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Mehrere Tage wählbar · nächste 4 Wochen
          </p>
        </div>
        <button
          type="button" onClick={onCancel}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* Weekday header */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        gap: 2, padding: "8px 10px 4px", borderBottom: "1px solid var(--border)",
      }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{
            textAlign: "center", fontSize: 11, fontWeight: 700,
            color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em",
          }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        gap: 3, padding: "6px 10px 10px",
      }}>
        {/* Empty cells before first day */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((d) => {
          const k = dateKey(d);
          const sel = selection[k];
          const isSelected = !!sel;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <div key={k}>
              {/* Day button */}
              <button
                type="button"
                onClick={() => toggleDay(d)}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 8,
                  border: isSelected
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border)",
                  background: isSelected ? "var(--accent-dim)" : "transparent",
                  color: isWeekend ? "var(--muted)" : "var(--text)",
                  fontWeight: isSelected ? 700 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  padding: 2,
                  transition: "border-color 0.1s, background 0.1s",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500 }}>
                  {d.getDate()}
                </span>
                {d.getDate() === 1 && (
                  <span style={{ fontSize: 9, color: "var(--muted)", lineHeight: 1 }}>
                    {MONTHS[d.getMonth()]}
                  </span>
                )}
              </button>

              {/* Slot toggles – only if selected */}
              {isSelected && (
                <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                  {(["vormittag", "nachmittag"] as const).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(d, slot)}
                      title={slot === "vormittag" ? "Vormittag" : "Nachmittag"}
                      style={{
                        flex: 1,
                        padding: "2px 0",
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 700,
                        border: "1px solid",
                        cursor: "pointer",
                        borderColor: sel[slot] ? "var(--accent)" : "var(--border)",
                        background: sel[slot] ? "var(--accent)" : "transparent",
                        color: sel[slot] ? "#fff" : "var(--muted)",
                        transition: "background 0.1s",
                      }}
                    >
                      {slot === "vormittag" ? "VM" : "NM"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div style={{ padding: "10px 16px 16px", borderTop: "1px solid var(--border)" }}>
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={() => onSubmit(formatAvailabilityMessage(selection))}
          style={{ width: "100%", opacity: selectedCount === 0 ? 0.4 : 1 }}
        >
          {busy
            ? "Wird gesendet…"
            : selectedCount === 0
              ? "Bitte mindestens einen Tag wählen"
              : `Absagen & ${selectedCount} Termin${selectedCount === 1 ? "" : "e"} senden`}
        </button>
        {selectedCount > 0 && (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
            {selectedCount} Tag{selectedCount === 1 ? "" : "e"} gewählt
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

type Props = {
  ticketId: string;
  ticketTitle: string;
  pendingProposal: { id: string; message: string; createdAt: string } | null;
  history: {
    id: string; message: string; status: AppointmentProposalStatus;
    createdAt: string; respondedAt: string | null;
    startAt: string | null; endAt: string | null;
  }[];
};

const statusLabel: Record<AppointmentProposalStatus, string> = {
  PENDING: "Ausstehend", CONFIRMED: "Bestätigt",
  REJECTED: "Abgelehnt", WITHDRAWN: "Ersetzt",
};

export function MieterAppointmentPanel({ ticketId, ticketTitle, pendingProposal, history }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  async function confirm(proposalId: string) {
    setError(""); setBusy(true);
    try {
      const res = await fetch(
        `/api/mieter-app/tickets/${ticketId}/appointment-proposals/${proposalId}/respond`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "confirm" }) }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Aktion fehlgeschlagen."); return; }
      router.refresh();
    } catch { setError("Netzwerkfehler."); }
    finally { setBusy(false); }
  }

  async function rejectWithAvailability(proposalId: string, availabilityMsg: string) {
    setError(""); setBusy(true);
    try {
      // 1. reject the proposal
      const res1 = await fetch(
        `/api/mieter-app/tickets/${ticketId}/appointment-proposals/${proposalId}/respond`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "reject" }) }
      );
      if (!res1.ok) { setError("Absage fehlgeschlagen."); return; }

      // 2. send availability as a note
      await fetch(`/api/mieter-app/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: availabilityMsg }),
        credentials: "include",
      });

      setShowCalendar(false);
      router.refresh();
    } catch { setError("Netzwerkfehler."); }
    finally { setBusy(false); }
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

          {!showCalendar ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button" disabled={busy}
                onClick={() => confirm(pendingProposal.id)}
                style={{ width: "100%" }}
              >
                Bestätigen
              </button>
              <button
                type="button" disabled={busy}
                onClick={() => setShowCalendar(true)}
                style={{
                  width: "100%", background: "transparent", color: "#f87171",
                  border: "1px solid rgba(248,113,113,0.4)", borderRadius: "var(--radius-sm)",
                  padding: "10px 16px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", transition: "background 0.15s",
                }}
              >
                Ablehnen &amp; Alternativen angeben
              </button>
            </div>
          ) : (
            <AvailabilityCalendar
              busy={busy}
              onCancel={() => setShowCalendar(false)}
              onSubmit={(msg) => rejectWithAvailability(pendingProposal.id, msg)}
            />
          )}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Aktuell liegt kein offener Terminvorschlag vor.
        </p>
      )}

      {error && <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>}

      {history.filter((h) => h.status !== "PENDING").length > 0 && (
        <div className="muted" style={{ fontSize: 13 }}>
          <p style={{ margin: "8px 0 4px", fontWeight: 600 }}>Frühere Vorschläge</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {history.filter((h) => h.status !== "PENDING").map((h) => (
              <li key={h.id} style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: h.status === "CONFIRMED" ? 600 : undefined }}>
                  {statusLabel[h.status]}:
                </span>{" "}
                {h.message}
                {h.status === "CONFIRMED" && (
                  <div style={{ marginTop: 4 }}>
                    <AddToCalendarButton
                      message={h.message} ticketTitle={ticketTitle}
                      startAt={h.startAt} endAt={h.endAt}
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

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentProposalStatus } from "@prisma/client";
import { formatAppointmentProposalStatus, formatDate } from "@/lib/format";

type Row = {
  id: string;
  message: string;
  status: AppointmentProposalStatus;
  createdAt: string;
  respondedAt: string | null;
};

type Props = {
  ticketId: string;
  proposals: Row[];
};

function toDatetimeLocalValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatGermanSlotLabel(localValue: string): string {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function buildProposalMessage(slotLocal: string, note: string): string {
  const when = formatGermanSlotLabel(slotLocal);
  const head = when ? `Handwerker-Termin: ${when}` : "";
  const extra = note.trim();
  if (extra) {
    return head ? `${head}\n\n${extra}` : extra;
  }
  return head;
}

export function TicketAppointmentLandlord({ ticketId, proposals }: Props) {
  const router = useRouter();
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [minSlot, setMinSlot] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMinSlot(toDatetimeLocalValue(new Date()));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (!slot.trim()) {
      setFeedback("Bitte Datum und Uhrzeit über den Kalender wählen.");
      return;
    }
    const parsed = new Date(slot);
    if (Number.isNaN(parsed.getTime())) {
      setFeedback("Ungültiges Datum oder Uhrzeit.");
      return;
    }
    const text = buildProposalMessage(slot, note).trim();
    if (text.length < 3) {
      setFeedback("Bitte einen gültigen Termin wählen.");
      return;
    }
    const startIso = parsed.toISOString();
    const endIso = new Date(parsed.getTime() + 60 * 60 * 1000).toISOString();
    setPending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/appointment-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, startAt: startIso, endAt: endIso })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback(data.error ?? "Vorschlag konnte nicht gesendet werden.");
        setPending(false);
        return;
      }
      setSlot("");
      setNote("");
      setFeedback("Terminvorschlag wurde an den Mieter gesendet.");
      router.refresh();
    } catch {
      setFeedback("Netzwerkfehler.");
    } finally {
      setPending(false);
    }
  }

  const preview = slot ? formatGermanSlotLabel(slot) : "";

  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Termin mit Handwerker</h3>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Wählen Sie Datum und Uhrzeit im Kalender. Der Mieter sieht den Vorschlag als Text und kann ihn
        bestätigen oder ablehnen.
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <div className="stack" style={{ gap: 6 }}>
          <label htmlFor="handwerker-termin" className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            Datum und Uhrzeit
          </label>
          <input
            id="handwerker-termin"
            className="appointment-handwerker-datetime"
            type="datetime-local"
            value={slot}
            min={minSlot}
            step={300}
            onChange={(e) => setSlot(e.target.value)}
            disabled={pending}
          />
          {preview ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Vorschau: {preview}
            </p>
          ) : null}
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <label htmlFor="handwerker-termin-note" className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            Zusatz (optional)
          </label>
          <textarea
            id="handwerker-termin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Zugang über Hintereingang, Dauer ca. 1 h …"
            rows={2}
            disabled={pending}
          />
        </div>
        <button type="submit" disabled={pending}>
          {pending ? "Wird gesendet …" : "Terminvorschlag senden"}
        </button>
      </form>
      {feedback && <p className="muted">{feedback}</p>}
      {proposals.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
            Verlauf
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {proposals.map((p) => (
              <li key={p.id} style={{ marginBottom: 8 }}>
                <span className="muted">{formatDate(new Date(p.createdAt))}</span> –{" "}
                {formatAppointmentProposalStatus(p.status)}: {p.message}
                {p.respondedAt ? (
                  <span className="muted">
                    {" "}
                    (Antwort {formatDate(new Date(p.respondedAt))})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

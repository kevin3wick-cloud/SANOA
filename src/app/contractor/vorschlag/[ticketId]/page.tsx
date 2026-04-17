"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type TicketInfo = {
  id: string;
  title: string;
  category: string;
  tenant: { apartment: string };
};

const CATEGORY_LABELS: Record<string, string> = {
  SANITAER: "Sanitär",
  HEIZUNG: "Heizung",
  ELEKTRO: "Elektro",
  FENSTER_TUEREN: "Fenster / Türen",
  ALLGEMEIN: "Allgemein",
  SONSTIGES: "Sonstiges",
};

export default function ContractorVorschlagPage() {
  const { ticketId } = useParams<{ ticketId: string }>();

  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Minimum date = tomorrow
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  useEffect(() => {
    fetch(`/api/contractor/vorschlag/${ticketId}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setTicket(data.ticket); })
      .catch(() => setNotFound(true));
  }, [ticketId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setError(""); setBusy(true);
    try {
      const res = await fetch(`/api/contractor/vorschlag/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time: time || null, message: message || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Fehler beim Senden.");
        return;
      }
      setDone(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const page: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0f0f13",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const card: React.CSSProperties = {
    background: "#1a1a24",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 440,
    color: "#e8e8f0",
  };

  const label: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#8888aa",
    marginBottom: 6,
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f0f13",
    color: "#e8e8f0",
    fontSize: 15,
    boxSizing: "border-box" as const,
    outline: "none",
  };

  const btn: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    border: "none",
    background: "#7c6af7",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy || !date ? 0.6 : 1,
    marginTop: 8,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div style={page}>
        <div style={card}>
          <p style={{ textAlign: "center", color: "#8888aa" }}>
            Ticket nicht gefunden oder bereits abgeschlossen.
          </p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: "center", color: "#8888aa" }}>Lädt…</div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Terminvorschlag gesendet</h2>
          <p style={{ margin: 0, color: "#8888aa", fontSize: 14 }}>
            Der Mieter wird benachrichtigt und kann den Termin bestätigen oder eine Alternative vorschlagen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            marginBottom: 16,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c6af7" }} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", color: "#8888aa" }}>
              SANOA
            </span>
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
            Terminvorschlag einreichen
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#8888aa" }}>
            {CATEGORY_LABELS[ticket.category] ?? ticket.category} · {ticket.tenant.apartment}
          </p>
          <p style={{
            margin: "10px 0 0",
            padding: "10px 12px",
            background: "rgba(124,106,247,0.08)",
            border: "1px solid rgba(124,106,247,0.2)",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
          }}>
            {ticket.title}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Datum *</label>
            <input
              type="date"
              required
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Uhrzeit (optional)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Anmerkung (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="z.B. Bitte Zugang zum Keller ermöglichen"
              rows={3}
              style={{ ...input, resize: "vertical" as const, fontFamily: "inherit" }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>
          )}

          <button type="submit" disabled={busy || !date} style={btn}>
            {busy ? "Wird gesendet…" : "Terminvorschlag senden"}
          </button>
        </form>
      </div>
    </div>
  );
}

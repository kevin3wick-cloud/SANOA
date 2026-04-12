"use client";

import { FormEvent, useState } from "react";
import { Sparkles } from "lucide-react";

type Note = {
  id: string;
  text: string;
  isInternal: boolean;
  isTenantAuthor: boolean;
  createdAt: string;
};

type TicketTenantChatProps = {
  ticketId: string;
  tenantName: string;
  ticketCreatedAt: string;
  ticketDescription: string;
  notes: Note[];
};

export function TicketTenantChat({
  ticketId,
  tenantName,
  ticketCreatedAt,
  ticketDescription,
  notes
}: TicketTenantChatProps) {
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showInternal, setShowInternal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const sorted = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const publicNotes = sorted.filter((n) => !n.isInternal);
  const internalNotes = sorted.filter((n) => n.isInternal);

  async function sendToTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setFeedback("Bitte eine Nachricht eingeben.");
      return;
    }
    const response = await fetch(`/api/tickets/${ticketId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message.trim(),
        isInternal: false
      })
    });
    if (!response.ok) {
      setFeedback("Nachricht konnte nicht gesendet werden.");
      return;
    }
    setMessage("");
    setFeedback("");
    window.location.reload();
  }

  async function loadAiSuggestion() {
    setAiLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}/ai-suggest`, {
        method: "POST",
      });
      const data = (await res.json()) as { suggestion?: string; error?: string };
      if (!res.ok || !data.suggestion) {
        setFeedback(data.error ?? "KI-Vorschlag nicht verfügbar.");
        return;
      }
      setMessage(data.suggestion);
    } catch {
      setFeedback("Netzwerkfehler beim KI-Vorschlag.");
    } finally {
      setAiLoading(false);
    }
  }

  async function saveInternal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!internalNote.trim()) {
      setFeedback("Bitte Text für die interne Notiz eingeben.");
      return;
    }
    const response = await fetch(`/api/tickets/${ticketId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: internalNote.trim(),
        isInternal: true
      })
    });
    if (!response.ok) {
      setFeedback("Interne Notiz konnte nicht gespeichert werden.");
      return;
    }
    setInternalNote("");
    setFeedback("");
    window.location.reload();
  }

  return (
    <div className="card stack ticket-chat-card">
      <div className="ticket-chat-header">
        <h3>Chat mit Mieter</h3>
        <p className="muted">
          Sichtbar für {tenantName}. Der Verlauf bleibt erhalten.
        </p>
      </div>

      <div className="ticket-chat-thread" role="log" aria-live="polite">
        <div className="ticket-chat-bubble ticket-chat-bubble--tenant">
          <div className="ticket-chat-meta">
            <strong>{tenantName}</strong>
            <span className="muted">
              {new Intl.DateTimeFormat("de-DE", {
                dateStyle: "short",
                timeStyle: "short"
              }).format(new Date(ticketCreatedAt))}
            </span>
          </div>
          <p className="ticket-chat-text">{ticketDescription}</p>
          <span className="ticket-chat-tag">Erstmeldung</span>
        </div>

        {publicNotes.map((note) => (
          <div
            key={note.id}
            className={
              note.isTenantAuthor
                ? "ticket-chat-bubble ticket-chat-bubble--tenant"
                : "ticket-chat-bubble ticket-chat-bubble--landlord"
            }
          >
            <div className="ticket-chat-meta">
              <strong>{note.isTenantAuthor ? tenantName : "Vermietung"}</strong>
              <span className="muted">
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short"
                }).format(new Date(note.createdAt))}
              </span>
            </div>
            <p className="ticket-chat-text">{note.text}</p>
            {note.isTenantAuthor ? (
              <span className="ticket-chat-tag">Nachricht</span>
            ) : null}
          </div>
        ))}
      </div>

      <form className="ticket-chat-compose stack" onSubmit={sendToTenant}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label className="muted" htmlFor="tenant-message">
            Nachricht an {tenantName}
          </label>
          <button
            type="button"
            onClick={loadAiSuggestion}
            disabled={aiLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--accent)",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              cursor: aiLoading ? "wait" : "pointer",
              opacity: aiLoading ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <Sparkles size={13} strokeWidth={2} />
            {aiLoading ? "KI lädt…" : "KI-Vorschlag"}
          </button>
        </div>
        <textarea
          id="tenant-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nachricht eingeben …"
          rows={3}
        />
        <button type="submit">Nachricht senden</button>
      </form>

      {internalNotes.length > 0 && (
        <div className="ticket-internal-notes">
          <p className="muted ticket-internal-title">Interne Notizen (nur Verwaltung)</p>
          <ul className="ticket-internal-list">
            {internalNotes.map((n) => (
              <li key={n.id}>
                <span className="muted">
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short"
                  }).format(new Date(n.createdAt))}
                </span>
                {n.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="secondary-button ticket-chat-toggle-internal"
        onClick={() => setShowInternal((v) => !v)}
      >
        {showInternal ? "Interne Notiz ausblenden" : "Interne Notiz hinzufügen"}
      </button>

      {showInternal && (
        <form className="stack" onSubmit={saveInternal}>
          <label className="muted" htmlFor="internal-note">
            Nur intern sichtbar
          </label>
          <textarea
            id="internal-note"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Interne Notiz …"
            rows={2}
          />
          <button type="submit" className="secondary-button">
            Intern speichern
          </button>
        </form>
      )}

      {feedback && <p className="muted">{feedback}</p>}
    </div>
  );
}

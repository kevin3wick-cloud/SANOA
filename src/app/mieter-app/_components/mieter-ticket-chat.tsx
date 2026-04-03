"use client";

import { FormEvent, useState } from "react";

export type MieterChatNote = {
  id: string;
  text: string;
  isTenantAuthor: boolean;
  createdAt: string;
};

type MieterTicketChatProps = {
  ticketId: string;
  tenantName: string;
  ticketCreatedAt: string;
  ticketDescription: string;
  notes: MieterChatNote[];
};

export function MieterTicketChat({
  ticketId,
  tenantName,
  ticketCreatedAt,
  ticketDescription,
  notes
}: MieterTicketChatProps) {
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  const sorted = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setFeedback("Bitte eine Nachricht eingeben.");
      return;
    }
    const response = await fetch(`/api/mieter-app/tickets/${ticketId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message.trim() }),
      credentials: "include"
    });
    if (!response.ok) {
      setFeedback("Nachricht konnte nicht gesendet werden.");
      return;
    }
    setMessage("");
    setFeedback("");
    window.location.reload();
  }

  return (
    <div className="card stack ticket-chat-card">
      <div className="ticket-chat-header">
        <h3>Nachrichten an die Verwaltung</h3>
        <p className="muted">
          Ihre Nachrichten und Rückmeldungen der Verwaltung erscheinen hier.
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

        {sorted.map((note) => (
          <div
            key={note.id}
            className={
              note.isTenantAuthor
                ? "ticket-chat-bubble ticket-chat-bubble--tenant"
                : "ticket-chat-bubble ticket-chat-bubble--landlord"
            }
          >
            <div className="ticket-chat-meta">
              <strong>{note.isTenantAuthor ? "Sie" : "Verwaltung"}</strong>
              <span className="muted">
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short"
                }).format(new Date(note.createdAt))}
              </span>
            </div>
            <p className="ticket-chat-text">{note.text}</p>
          </div>
        ))}
      </div>

      <form className="ticket-chat-compose stack" onSubmit={onSubmit}>
        <label className="muted" htmlFor="mieter-ticket-reply">
          Nachricht an die Verwaltung
        </label>
        <textarea
          id="mieter-ticket-reply"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nachricht eingeben …"
          rows={3}
        />
        <button type="submit">Nachricht senden</button>
      </form>

      {feedback && <p className="muted">{feedback}</p>}
    </div>
  );
}

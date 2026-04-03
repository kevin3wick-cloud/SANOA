"use client";

import { useState } from "react";
import { TicketStatus } from "@prisma/client";

type TicketActionsProps = {
  ticketId: string;
  currentStatus: TicketStatus;
};

export function TicketActions({ ticketId, currentStatus }: TicketActionsProps) {
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [feedback, setFeedback] = useState("");

  async function updateStatus(nextStatus: TicketStatus) {
    const response = await fetch(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!response.ok) {
      setFeedback("Status konnte nicht gespeichert werden.");
      return;
    }

    setFeedback("Status wurde aktualisiert.");
    window.location.reload();
  }

  return (
    <div className="stack ticket-actions-column">
      <div className="card stack">
        <h3>Aktionen</h3>
        <p className="muted">Status anpassen. Chat mit dem Mieter ist links.</p>
        <label className="muted">Status</label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as TicketStatus)}
        >
          <option value="OPEN">Offen</option>
          <option value="IN_PROGRESS">In Bearbeitung</option>
          <option value="DONE">Erledigt</option>
        </select>
        <button type="button" onClick={() => updateStatus(status)}>
          Status speichern
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => updateStatus("DONE")}
        >
          Als erledigt markieren
        </button>
      </div>
      {feedback && <p className="muted">{feedback}</p>}
    </div>
  );
}

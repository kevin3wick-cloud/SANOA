"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

type Props = {
  ticketId: string;
  isDone: boolean;
};

export function MieterCloseTicketForm({ ticketId, isDone }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isDone) {
    return (
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          background: "var(--bg-card)"
        }}
      >
        <CheckCircle size={16} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: 14 }}>Dieses Ticket ist als erledigt markiert.</span>
      </div>
    );
  }

  async function handleSubmit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/mieter-app/tickets/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      });
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
      <h3 style={{ margin: 0 }}>Problem behoben?</h3>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ alignSelf: "flex-start" }}
        >
          Ticket als erledigt markieren
        </button>
      ) : (
        <div className="stack">
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Kurz beschreiben, was passiert ist oder wie das Problem gelöst wurde (optional).
          </p>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="z. B. Schaden hat sich von selbst behoben, Handwerker war da …"
            disabled={busy}
          />
          <div className="inline-action-buttons">
            <button type="button" onClick={handleSubmit} disabled={busy}>
              {busy ? "Wird gespeichert …" : "Bestätigen"}
            </button>
            <button
              type="button"
              className="secondary-button btn-inline"
              onClick={() => { setOpen(false); setComment(""); setError(""); }}
              disabled={busy}
            >
              Abbrechen
            </button>
          </div>
          {error && <p className="muted">{error}</p>}
        </div>
      )}
    </div>
  );
}

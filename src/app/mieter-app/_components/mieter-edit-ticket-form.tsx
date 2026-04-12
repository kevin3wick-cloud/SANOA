"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

type Props = {
  ticketId: string;
  currentDescription: string;
};

export function MieterEditTicketForm({ ticketId, currentDescription }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(currentDescription);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (description.trim().length < 3) {
      setError("Mindestens 3 Zeichen.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/mieter-app/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Speichern.");
        return;
      }
      setOpen(false);
      window.location.reload();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--muted)",
          cursor: "pointer",
        }}
      >
        <Pencil size={13} strokeWidth={2} />
        Beschreibung bearbeiten
      </button>
    );
  }

  return (
    <div className="card stack" style={{ borderColor: "var(--accent)", borderWidth: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Beschreibung bearbeiten</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setDescription(currentDescription); setError(""); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>
      <textarea
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={saving}
        autoFocus
      />
      {error && <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={save} disabled={saving}>
          {saving ? "Speichern…" : "Speichern"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => { setOpen(false); setDescription(currentDescription); setError(""); }}
          disabled={saving}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

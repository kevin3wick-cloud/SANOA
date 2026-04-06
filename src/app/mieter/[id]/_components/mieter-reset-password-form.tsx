"use client";

import { FormEvent, useState } from "react";

type Props = {
  tenantId: string;
  hasAppAccess: boolean;
};

export function MieterResetPasswordForm({ tenantId, hasAppAccess }: Props) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  if (!hasAppAccess) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Dieser Mieter hat noch keinen App-Zugang (noch nicht eingeladen).
      </p>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/mieter/${tenantId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Zurücksetzen." });
      } else {
        setFeedback({ type: "ok", msg: "Passwort wurde erfolgreich zurückgesetzt." });
        setNewPassword("");
        setOpen(false);
      }
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler. Bitte erneut versuchen." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setFeedback(null); }}
          style={{ fontSize: 13 }}
        >
          Passwort zurücksetzen
        </button>
      ) : (
        <form className="stack" onSubmit={handleSubmit} style={{ maxWidth: 320 }}>
          <input
            type="password"
            placeholder="Neues Passwort (min. 6 Zeichen)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={loading} style={{ fontSize: 13 }}>
              {loading ? "Wird gespeichert…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setNewPassword(""); setFeedback(null); }}
              style={{ fontSize: 13 }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
      {feedback && (
        <p
          className="muted"
          style={{
            marginTop: 8,
            color: feedback.type === "err" ? "var(--color-danger, #e53e3e)" : "var(--color-success, #38a169)",
            fontSize: 13,
          }}
        >
          {feedback.msg}
        </p>
      )}
    </div>
  );
}

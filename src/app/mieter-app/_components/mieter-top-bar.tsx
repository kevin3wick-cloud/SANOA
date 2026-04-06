"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, KeyRound, X } from "lucide-react";

export function MieterTopBar() {
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function logout() {
    await fetch("/api/mieter-app/logout", { method: "POST" });
    router.push("/mieter-app/login");
    router.refresh();
  }

  function openPasswordForm() {
    setShowPasswordForm(true);
    setFeedback(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function closePasswordForm() {
    setShowPasswordForm(false);
    setFeedback(null);
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "err", msg: "Passwörter stimmen nicht überein." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mieter-app/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Ändern des Passworts." });
      } else {
        setFeedback({ type: "ok", msg: "Passwort erfolgreich geändert." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler. Bitte erneut versuchen." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mieter-top-bar">
        <button
          type="button"
          className="secondary-button mieter-logout-btn"
          onClick={openPasswordForm}
          title="Passwort ändern"
        >
          <KeyRound size={14} strokeWidth={1.75} aria-hidden />
          Passwort
        </button>
        <button
          type="button"
          className="secondary-button mieter-logout-btn"
          onClick={() => void logout()}
        >
          <LogOut size={14} strokeWidth={1.75} aria-hidden />
          Logout
        </button>
      </div>

      {showPasswordForm && (
        <div className="card stack" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: 15 }}>Passwort ändern</h4>
            <button
              type="button"
              onClick={closePasswordForm}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              aria-label="Schließen"
            >
              <X size={16} />
            </button>
          </div>
          <form className="stack" onSubmit={handlePasswordChange}>
            <input
              type="password"
              placeholder="Aktuelles Passwort"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Neues Passwort (min. 6 Zeichen)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Neues Passwort bestätigen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? "Wird gespeichert…" : "Speichern"}
              </button>
              <button type="button" onClick={closePasswordForm} style={{ flex: 1 }}>
                Abbrechen
              </button>
            </div>
          </form>
          {feedback && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: feedback.type === "err" ? "var(--color-danger, #e53e3e)" : "var(--color-success, #38a169)",
              }}
            >
              {feedback.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { FormEvent, useState, useEffect } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type SettingsPanelsProps = {
  currentUserRole: string;
  currentUserName: string;
  currentUserEmail: string;
};

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "err", msg: "Neues Passwort und Bestätigung stimmen nicht überein." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Ändern des Passworts." });
      } else {
        setFeedback({ type: "ok", msg: "Passwort wurde erfolgreich geändert." });
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
    <div className="card stack">
      <h3>Passwort ändern</h3>
      <form className="stack" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Aktuelles Passwort"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
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
        <button type="submit" disabled={loading}>
          {loading ? "Wird gespeichert…" : "Passwort speichern"}
        </button>
      </form>
      {feedback && (
        <p
          className="muted"
          style={{
            margin: "4px 0 0",
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

function EmailSettingsPanel() {
  const [senderName, setSenderName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/einstellungen/email")
      .then(r => r.json())
      .then(d => { setSenderName(d.senderName ?? ""); setReplyToEmail(d.replyToEmail ?? ""); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      const res = await fetch("/api/einstellungen/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderName, replyToEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Speichern." });
      } else {
        setFeedback({ type: "ok", msg: "Einstellungen gespeichert." });
      }
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <div>
        <h3 style={{ margin: 0 }}>E-Mail Absender</h3>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
          Automatische E-Mails an Handwerker werden in eurem Namen versendet.
          Antworten gehen direkt an eure Adresse.
        </p>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Absendername
          </label>
          <input
            type="text"
            placeholder="z.B. Hausverwaltung Muster AG"
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
          />
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
            Erscheint als Absender beim Handwerker: <em>{senderName || "Sanoa Hausverwaltung"} &lt;noreply@sanoa.tech&gt;</em>
          </p>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Antwort-Adresse (Reply-To)
          </label>
          <input
            type="email"
            placeholder="z.B. info@ihre-hausverwaltung.ch"
            value={replyToEmail}
            onChange={e => setReplyToEmail(e.target.value)}
          />
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
            Wenn der Handwerker antwortet, landet die E-Mail direkt bei euch.
          </p>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Wird gespeichert…" : "Speichern"}
        </button>
      </form>
      {feedback && (
        <p style={{ margin: 0, fontSize: 13, color: feedback.type === "err" ? "#f87171" : "#34d399" }}>
          {feedback.msg}
        </p>
      )}
    </div>
  );
}

export function SettingsPanels({ currentUserRole, currentUserName, currentUserEmail }: SettingsPanelsProps) {
  const isAdmin = currentUserRole === "ADMIN";

  // Vermieter list state (admin only)
  const [vermieterList, setVermieterList] = useState<UserRow[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  // New Vermieter form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function loadVermieter() {
    setListLoading(true);
    try {
      const res = await fetch("/api/admin/vermieter");
      const data = await res.json();
      if (res.ok) {
        setVermieterList(data.users ?? []);
        setListLoaded(true);
      }
    } finally {
      setListLoading(false);
    }
  }

  async function addVermieter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/vermieter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Erstellen." });
        return;
      }
      setFeedback({ type: "ok", msg: `Vermieter ${newEmail} wurde erstellt.` });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      // Refresh list
      const listRes = await fetch("/api/admin/vermieter");
      const listData = await listRes.json();
      if (listRes.ok) setVermieterList(listData.users ?? []);
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler. Bitte erneut versuchen." });
    } finally {
      setAddLoading(false);
    }
  }

  async function removeVermieter(id: string) {
    if (!confirm("Vermieter wirklich entfernen?")) return;
    const res = await fetch(`/api/admin/vermieter?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setVermieterList((prev) => prev.filter((u) => u.id !== id));
    }
  }

  return (
    <div className="stack">
      <EmailSettingsPanel />

      <div className="card">
        <h3>Mein Konto</h3>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          <strong>{currentUserName}</strong> — {currentUserEmail}
        </p>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
          Rolle: {currentUserRole === "ADMIN" ? "Administrator" : "Vermieter"}
        </p>
      </div>

      <ChangePasswordForm />

      {isAdmin && (
        <div className="card">
          <h3>Vermieter verwalten</h3>
          <p className="muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
            Hier können Sie neue Vermieter-Zugänge erstellen und bestehende entfernen.
          </p>

          {!listLoaded ? (
            <button type="button" onClick={loadVermieter} disabled={listLoading} style={{ marginBottom: 16 }}>
              {listLoading ? "Wird geladen…" : "Benutzer anzeigen"}
            </button>
          ) : (
            <ul style={{ margin: "0 0 16px", padding: 0, listStyle: "none" }}>
              {vermieterList.map((u) => (
                <li
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid var(--color-border, #e2e8f0)",
                  }}
                >
                  <span>
                    <strong>{u.name}</strong>{" "}
                    <span className="muted" style={{ fontSize: 13 }}>
                      {u.email} ({u.role === "ADMIN" ? "Admin" : "Vermieter"})
                    </span>
                  </span>
                  {u.role !== "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => removeVermieter(u.id)}
                      style={{ fontSize: 12, padding: "2px 8px" }}
                    >
                      Entfernen
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form className="stack" onSubmit={addVermieter}>
            <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Neuen Vermieter hinzufügen</h4>
            <input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="E-Mail"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Passwort (min. 6 Zeichen)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <button type="submit" disabled={addLoading}>
              {addLoading ? "Wird erstellt…" : "Vermieter hinzufügen"}
            </button>
          </form>

          {feedback && (
            <p
              className="muted"
              style={{
                margin: "8px 0 0",
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

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { User, KeyRound, CheckCircle, AlertCircle } from "lucide-react";

type Feedback = { type: "ok" | "err"; msg: string };

function FeedbackMsg({ fb }: { fb: Feedback }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: fb.type === "ok" ? "#34d399" : "#f87171",
        padding: "8px 12px",
        borderRadius: 8,
        background: fb.type === "ok" ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
      }}
    >
      {fb.type === "ok"
        ? <CheckCircle size={15} strokeWidth={2} />
        : <AlertCircle size={15} strokeWidth={2} />}
      {fb.msg}
    </div>
  );
}

// ── Name change ───────────────────────────────────────────────────────────────

function NameChangeForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [newName, setNewName] = useState(currentName);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fb, setFb] = useState<Feedback | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFb(null);
    if (newName.trim() === currentName.trim()) {
      setFb({ type: "err", msg: "Der Name ist identisch mit dem aktuellen Namen." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mieter-app/change-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: newName.trim(), reason: reason.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFb({ type: "err", msg: data.error ?? "Fehler beim Speichern." });
      } else {
        setFb({ type: "ok", msg: "Name erfolgreich geändert. Die Verwaltung wurde informiert." });
        setReason("");
        router.refresh();
      }
    } catch {
      setFb({ type: "err", msg: "Netzwerkfehler. Bitte erneut versuchen." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "var(--accent, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <User size={18} strokeWidth={1.75} color="#fff" aria-hidden />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Name anpassen</h3>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
            z.B. nach Heirat oder Scheidung
          </p>
        </div>
      </div>

      <form className="stack" onSubmit={onSubmit}>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
            Vollständiger Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Vorname Nachname"
            required
            minLength={2}
            maxLength={80}
            disabled={loading}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
            Grund <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z.B. Heirat, Scheidung, Namenskorrektur …"
            maxLength={120}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading || newName.trim() === currentName.trim()}>
          {loading ? "Wird gespeichert…" : "Name speichern"}
        </button>
      </form>

      {fb && <FeedbackMsg fb={fb} />}

      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Die Verwaltung sieht die Änderung sofort in Ihren Ticket-Unterlagen.
      </p>
    </div>
  );
}

// ── Password change ───────────────────────────────────────────────────────────

function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [fb, setFb] = useState<Feedback | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFb(null);
    if (next !== confirm) {
      setFb({ type: "err", msg: "Passwörter stimmen nicht überein." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mieter-app/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFb({ type: "err", msg: data.error ?? "Fehler beim Ändern des Passworts." });
      } else {
        setFb({ type: "ok", msg: "Passwort erfolgreich geändert." });
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      setFb({ type: "err", msg: "Netzwerkfehler. Bitte erneut versuchen." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "var(--surface, #1e2030)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <KeyRound size={18} strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Passwort ändern</h3>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
            Mindestens 6 Zeichen
          </p>
        </div>
      </div>

      <form className="stack" onSubmit={onSubmit}>
        <input
          type="password"
          placeholder="Aktuelles Passwort"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
        />
        <input
          type="password"
          placeholder="Neues Passwort (min. 6 Zeichen)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={6}
          disabled={loading}
          autoComplete="new-password"
        />
        <input
          type="password"
          placeholder="Neues Passwort bestätigen"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          disabled={loading}
          autoComplete="new-password"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Wird gespeichert…" : "Passwort speichern"}
        </button>
      </form>

      {fb && <FeedbackMsg fb={fb} />}
    </div>
  );
}

// ── Combined export ───────────────────────────────────────────────────────────

export function MieterSettingsForms({
  currentName,
  apartment,
}: {
  currentName: string;
  apartment: string;
}) {
  return (
    <>
      {/* Profile info */}
      <div className="card" style={{ padding: "14px 18px" }}>
        <p className="muted" style={{ margin: 0, fontSize: 12, marginBottom: 4 }}>Wohnung</p>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{apartment}</p>
      </div>

      <NameChangeForm currentName={currentName} />
      <PasswordChangeForm />
    </>
  );
}

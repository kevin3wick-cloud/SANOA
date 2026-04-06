"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, UserPlus } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Props = {
  currentUserId: string;
};

export function AdminVermieterPanel({ currentUserId }: Props) {
  const router = useRouter();
  const [vermieterList, setVermieterList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    void loadVermieter();
  }, []);

  async function loadVermieter() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vermieter");
      const data = (await res.json()) as { users?: UserRow[] };
      if (res.ok) setVermieterList(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function addVermieter(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/vermieter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Erstellen." });
        return;
      }
      setFeedback({ type: "ok", msg: `${newEmail} wurde als Vermieter angelegt.` });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await loadVermieter();
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler." });
    } finally {
      setAddLoading(false);
    }
  }

  async function removeVermieter(id: string, name: string) {
    if (!confirm(`"${name}" wirklich entfernen?`)) return;
    const res = await fetch(`/api/admin/vermieter?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setVermieterList((prev) => prev.filter((u) => u.id !== id));
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const vermieterOnly = vermieterList.filter((u) => u.role === "LANDLORD");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #f5f6fa)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Sanoa Admin</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-muted, #6b7280)" }}>
              Vermieter-Verwaltung
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
          >
            <LogOut size={14} strokeWidth={1.75} aria-hidden />
            Logout
          </button>
        </div>

        {/* Vermieter hinzufügen */}
        <div className="card stack" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            <UserPlus size={16} strokeWidth={1.75} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Vermieter hinzufügen
          </h2>
          <form className="stack" onSubmit={addVermieter}>
            <input
              type="text"
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
              {addLoading ? "Wird erstellt…" : "Vermieter anlegen"}
            </button>
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

        {/* Vermieter-Liste */}
        <div className="card stack">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Vermieter ({vermieterOnly.length})
          </h2>
          {loading ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Wird geladen…</p>
          ) : vermieterOnly.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Noch keine Vermieter angelegt.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vermieterOnly.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "var(--color-surface-2, #f9fafb)",
                    borderRadius: 8,
                    border: "1px solid var(--color-border, #e5e7eb)",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{u.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-muted, #6b7280)" }}>
                      {u.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeVermieter(u.id, u.name)}
                    disabled={u.id === currentUserId}
                    title="Vermieter löschen"
                    style={{
                      background: "none",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      borderRadius: 6,
                      padding: "5px 8px",
                      cursor: u.id === currentUserId ? "not-allowed" : "pointer",
                      color: u.id === currentUserId ? "var(--color-muted, #9ca3af)" : "var(--color-danger, #e53e3e)",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

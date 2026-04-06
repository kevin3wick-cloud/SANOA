"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LogOut, UserPlus, KeyRound, X, ShieldCheck, User, Eye } from "lucide-react";

type OrgRole = "ORG_ADMIN" | "ORG_USER" | "ORG_GUEST";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  orgRole: OrgRole;
};

type Props = {
  currentUserId: string;
};

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  ORG_ADMIN: "Admin",
  ORG_USER: "Benutzer",
  ORG_GUEST: "Gast",
};

const ORG_ROLE_COLORS: Record<OrgRole, string> = {
  ORG_ADMIN: "#7c3aed",
  ORG_USER: "#2563eb",
  ORG_GUEST: "#6b7280",
};

function OrgRoleBadge({ orgRole }: { orgRole: OrgRole }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 12,
        background: ORG_ROLE_COLORS[orgRole] + "18",
        color: ORG_ROLE_COLORS[orgRole],
        border: `1px solid ${ORG_ROLE_COLORS[orgRole]}40`,
      }}
    >
      {ORG_ROLE_LABELS[orgRole]}
    </span>
  );
}

function ResetPasswordInline({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vermieter/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Zurücksetzen." });
      } else {
        setFeedback({ type: "ok", msg: "Passwort wurde gesetzt." });
        setNewPassword("");
        setOpen(false);
      }
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setFeedback(null); }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 12,
            color: "var(--color-muted, #6b7280)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <KeyRound size={12} strokeWidth={1.75} aria-hidden />
          Passwort zurücksetzen
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
          >
            <input
              type="password"
              placeholder={`Neues Passwort für ${name}`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              style={{ flex: 1, minWidth: 180, fontSize: 13, padding: "5px 10px" }}
            />
            <button type="submit" disabled={loading} style={{ fontSize: 13, padding: "5px 12px" }}>
              {loading ? "…" : "Setzen"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setNewPassword(""); setFeedback(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}
            >
              <X size={14} strokeWidth={1.75} aria-hidden />
            </button>
          </form>
          {feedback && (
            <p style={{
              margin: 0,
              fontSize: 12,
              color: feedback.type === "err" ? "var(--color-danger, #e53e3e)" : "var(--color-success, #38a169)",
            }}>
              {feedback.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminVermieterPanel({ currentUserId }: Props) {
  const router = useRouter();
  const [vermieterList, setVermieterList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsOrgAdmin, setNewIsOrgAdmin] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

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
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          isOrgAdmin: newIsOrgAdmin,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({ type: "err", msg: data.error ?? "Fehler beim Erstellen." });
        return;
      }
      setFeedback({
        type: "ok",
        msg: `${newEmail} wurde als Vermieter angelegt (${newIsOrgAdmin ? "Admin" : "Benutzer"}).`,
      });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewIsOrgAdmin(false);
      await loadVermieter();
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler." });
    } finally {
      setAddLoading(false);
    }
  }

  async function changeOrgRole(id: string, orgRole: OrgRole) {
    setRoleChanging(id);
    try {
      const res = await fetch(`/api/admin/vermieter/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgRole }),
      });
      if (res.ok) {
        setVermieterList((prev) =>
          prev.map((u) => (u.id === id ? { ...u, orgRole } : u))
        );
      }
    } finally {
      setRoleChanging(null);
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

  const orgRoleIcon = (r: OrgRole) =>
    r === "ORG_ADMIN" ? <ShieldCheck size={12} /> : r === "ORG_GUEST" ? <Eye size={12} /> : <User size={12} />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #f5f6fa)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
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

            {/* Rolle-Auswahl */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "var(--color-surface-2, #f9fafb)",
                borderRadius: 8,
                border: "1px solid var(--color-border, #e5e7eb)",
              }}
            >
              <button
                type="button"
                role="switch"
                aria-checked={newIsOrgAdmin}
                onClick={() => setNewIsOrgAdmin((v) => !v)}
                style={{
                  width: 38,
                  height: 22,
                  borderRadius: 11,
                  border: "none",
                  background: newIsOrgAdmin ? "#7c3aed" : "#d1d5db",
                  cursor: "pointer",
                  position: "relative",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: newIsOrgAdmin ? 18 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </button>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {newIsOrgAdmin ? "Verwaltungs-Admin" : "Benutzer"}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-muted, #6b7280)", marginTop: 1 }}>
                  {newIsOrgAdmin
                    ? "Kann Mitarbeiter hinzufügen und verwalten"
                    : "Kann Tickets bearbeiten, keine Benutzerverwaltung"}
                </div>
              </div>
            </div>

            <button type="submit" disabled={addLoading}>
              {addLoading ? "Wird erstellt…" : "Vermieter anlegen"}
            </button>
          </form>
          {feedback && (
            <p style={{
              margin: 0,
              fontSize: 13,
              color: feedback.type === "err" ? "var(--color-danger, #e53e3e)" : "var(--color-success, #38a169)",
            }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {vermieterOnly.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--color-surface-2, #f9fafb)",
                    borderRadius: 8,
                    border: "1px solid var(--color-border, #e5e7eb)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{u.name}</p>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {orgRoleIcon(u.orgRole)}
                          <OrgRoleBadge orgRole={u.orgRole} />
                        </div>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-muted, #6b7280)" }}>
                        {u.email}
                      </p>
                      {/* Rolle ändern */}
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {(["ORG_ADMIN", "ORG_USER", "ORG_GUEST"] as OrgRole[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            disabled={u.orgRole === r || roleChanging === u.id}
                            onClick={() => void changeOrgRole(u.id, r)}
                            style={{
                              fontSize: 11,
                              padding: "3px 8px",
                              borderRadius: 8,
                              border: `1px solid ${u.orgRole === r ? ORG_ROLE_COLORS[r] : "var(--color-border, #e5e7eb)"}`,
                              background: u.orgRole === r ? ORG_ROLE_COLORS[r] + "18" : "transparent",
                              color: u.orgRole === r ? ORG_ROLE_COLORS[r] : "var(--color-muted, #6b7280)",
                              cursor: u.orgRole === r ? "default" : "pointer",
                              fontWeight: u.orgRole === r ? 600 : 400,
                            }}
                          >
                            {ORG_ROLE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                      <ResetPasswordInline userId={u.id} name={u.name} />
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
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

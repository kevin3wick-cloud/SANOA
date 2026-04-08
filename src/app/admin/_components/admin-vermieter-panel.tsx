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
  ORG_USER: "#818cf8",
  ORG_GUEST: "#6b7280",
};

const ORG_ROLE_DESC: Record<OrgRole, string> = {
  ORG_ADMIN: "Vollzugriff + Benutzerverwaltung",
  ORG_USER: "Tickets bearbeiten",
  ORG_GUEST: "Nur lesen",
};

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%",
      background: color + "22", color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 15, fontWeight: 700, flexShrink: 0,
      border: `1.5px solid ${color}44`,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function RolePill({ orgRole }: { orgRole: OrgRole }) {
  const color = ORG_ROLE_COLORS[orgRole];
  const Icon = orgRole === "ORG_ADMIN" ? ShieldCheck : orgRole === "ORG_GUEST" ? Eye : User;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: color + "18", color,
      border: `1px solid ${color}33`,
    }}>
      <Icon size={10} />
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
        setFeedback({ type: "ok", msg: "Passwort gesetzt." });
        setNewPassword("");
        setOpen(false);
      }
    } catch {
      setFeedback({ type: "err", msg: "Netzwerkfehler." });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return (
    <button type="button" onClick={() => { setOpen(true); setFeedback(null); }}
      style={{
        background: "none", border: "none", padding: 0, cursor: "pointer",
        fontSize: 12, color: "var(--muted)",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}>
      <KeyRound size={11} strokeWidth={1.75} /> Passwort zurücksetzen
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input type="password" placeholder={`Neues Passwort für ${name}`} value={newPassword}
          onChange={e => setNewPassword(e.target.value)} required minLength={6} autoFocus
          style={{ flex: 1, minWidth: 160, fontSize: 13, padding: "5px 10px" }} />
        <button type="submit" disabled={loading} style={{ fontSize: 13, padding: "5px 12px", width: "auto" }}>
          {loading ? "…" : "Setzen"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setNewPassword(""); setFeedback(null); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", width: "auto" }}>
          <X size={14} strokeWidth={1.75} />
        </button>
      </form>
      {feedback && <p style={{ margin: 0, fontSize: 12, color: feedback.type === "ok" ? "#34d399" : "#f87171" }}>{feedback.msg}</p>}
    </div>
  );
}

export function AdminVermieterPanel({ currentUserId }: Props) {
  const router = useRouter();
  const [vermieterList, setVermieterList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsOrgAdmin, setNewIsOrgAdmin] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  useEffect(() => { void loadVermieter(); }, []);

  async function loadVermieter() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vermieter");
      const data = (await res.json()) as { users?: UserRow[] };
      if (res.ok) setVermieterList(data.users ?? []);
    } finally { setLoading(false); }
  }

  async function addVermieter(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/vermieter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, isOrgAdmin: newIsOrgAdmin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setFeedback({ type: "err", msg: data.error ?? "Fehler." }); return; }
      setFeedback({ type: "ok", msg: `${newEmail} wurde als Vermieter angelegt (${newIsOrgAdmin ? "Admin" : "Benutzer"}).` });
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewIsOrgAdmin(false);
      setShowAdd(false);
      await loadVermieter();
    } catch { setFeedback({ type: "err", msg: "Netzwerkfehler." }); }
    finally { setAddLoading(false); }
  }

  async function changeOrgRole(id: string, orgRole: OrgRole) {
    setRoleChanging(id);
    try {
      const res = await fetch(`/api/admin/vermieter/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgRole }),
      });
      if (res.ok) setVermieterList(prev => prev.map(u => u.id === id ? { ...u, orgRole } : u));
    } finally { setRoleChanging(null); }
  }

  async function removeVermieter(id: string, name: string) {
    if (!confirm(`"${name}" wirklich entfernen?`)) return;
    const res = await fetch(`/api/admin/vermieter?id=${id}`, { method: "DELETE" });
    if (res.ok) setVermieterList(prev => prev.filter(u => u.id !== id));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const vermieterOnly = vermieterList.filter(u => u.role === "LANDLORD");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Sanoa Admin</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Vermieter-Verwaltung</p>
          </div>
          <button type="button" onClick={() => void logout()}
            style={{
              width: "auto", background: "transparent", border: "1px solid var(--border)",
              color: "var(--text)", display: "inline-flex", alignItems: "center",
              gap: 6, fontSize: 13, padding: "8px 14px", borderRadius: "var(--radius-sm)",
            }}>
            <LogOut size={14} strokeWidth={1.75} />
            Logout
          </button>
        </div>

        {/* Vermieter hinzufügen */}
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => { setShowAdd(v => !v); setFeedback(null); }}
            style={{
              width: "auto", display: "inline-flex", alignItems: "center",
              gap: 6, fontSize: 13, padding: "8px 14px",
            }}>
            <UserPlus size={15} strokeWidth={1.75} />
            Vermieter hinzufügen
          </button>
        </div>

        {showAdd && (
          <div className="card stack" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Neuer Vermieter</h3>
            <form className="stack" onSubmit={addVermieter}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input type="text" placeholder="Name" value={newName}
                  onChange={e => setNewName(e.target.value)} required />
                <input type="email" placeholder="E-Mail" value={newEmail}
                  onChange={e => setNewEmail(e.target.value)} required />
              </div>
              <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} required minLength={6} />

              {/* Rolle-Karten */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rolle</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([false, true] as const).map(isAdmin => (
                    <label key={String(isAdmin)} style={{
                      flex: 1, display: "flex", flexDirection: "column", gap: 3,
                      padding: "12px", borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${newIsOrgAdmin === isAdmin ? (isAdmin ? "#7c3aed" : "#818cf8") : "var(--border)"}`,
                      background: newIsOrgAdmin === isAdmin ? (isAdmin ? "#7c3aed" : "#818cf8") + "0d" : "transparent",
                      transition: "border-color 0.15s",
                    }}>
                      <input type="radio" name="isOrgAdmin" checked={newIsOrgAdmin === isAdmin}
                        onChange={() => setNewIsOrgAdmin(isAdmin)} style={{ display: "none" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: newIsOrgAdmin === isAdmin ? (isAdmin ? "#7c3aed" : "#818cf8") : "var(--text)" }}>
                        {isAdmin ? "Admin" : "Benutzer"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {isAdmin ? "Vollzugriff + Benutzerverwaltung" : "Tickets bearbeiten, kein Team"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={addLoading}>{addLoading ? "Wird erstellt…" : "Anlegen"}</button>
                <button type="button" onClick={() => { setShowAdd(false); setFeedback(null); }}
                  style={{ background: "transparent", border: "1px solid var(--border)", width: "auto", padding: "11px 16px", color: "var(--text)" }}>
                  Abbrechen
                </button>
              </div>
            </form>
            {feedback && (
              <p style={{ margin: 0, fontSize: 13, color: feedback.type === "ok" ? "#34d399" : "#f87171" }}>{feedback.msg}</p>
            )}
          </div>
        )}

        {feedback && !showAdd && (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: feedback.type === "ok" ? "#34d399" : "#f87171" }}>{feedback.msg}</p>
        )}

        {/* Vermieter-Liste */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Vermieter</h2>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{vermieterOnly.length} Accounts</span>
          </div>

          {loading ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", padding: "20px" }}>Wird geladen…</p>
          ) : vermieterOnly.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", padding: "20px" }}>Noch keine Vermieter angelegt.</p>
          ) : (
            <div>
              {vermieterOnly.map((u, idx) => (
                <div key={u.id} style={{
                  padding: "14px 20px",
                  borderBottom: idx < vermieterOnly.length - 1 ? "1px solid var(--border)" : "none",
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}>
                  <Avatar name={u.name} color={ORG_ROLE_COLORS[u.orgRole]} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                      <RolePill orgRole={u.orgRole} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{u.email}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Rolle:</span>
                      <select
                        value={u.orgRole}
                        disabled={roleChanging === u.id}
                        onChange={e => void changeOrgRole(u.id, e.target.value as OrgRole)}
                        style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, width: "auto" }}
                      >
                        {(Object.keys(ORG_ROLE_LABELS) as OrgRole[]).map(r => (
                          <option key={r} value={r}>{ORG_ROLE_LABELS[r]} – {ORG_ROLE_DESC[r]}</option>
                        ))}
                      </select>
                      {roleChanging === u.id && <span style={{ fontSize: 11, color: "var(--muted)" }}>…</span>}
                    </div>
                    <ResetPasswordInline userId={u.id} name={u.name} />
                  </div>
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => void removeVermieter(u.id, u.name)}
                      title="Vermieter löschen"
                      style={{
                        background: "none", border: "1px solid transparent", borderRadius: 6,
                        padding: "5px 7px", cursor: "pointer", color: "var(--muted)",
                        display: "inline-flex", alignItems: "center", flexShrink: 0,
                        width: "auto", transition: "color 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#f8717144";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

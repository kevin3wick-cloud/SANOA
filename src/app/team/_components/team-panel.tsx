"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, KeyRound, ShieldCheck, Trash2, User, UserPlus, X } from "lucide-react";

type OrgRole = "ORG_ADMIN" | "ORG_USER" | "ORG_GUEST";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  orgRole: OrgRole;
};

const ROLE_LABELS: Record<OrgRole, string> = {
  ORG_ADMIN: "Admin",
  ORG_USER: "Benutzer",
  ORG_GUEST: "Gast (nur Lesen)",
};

const ROLE_DESC: Record<OrgRole, string> = {
  ORG_ADMIN: "Vollzugriff, kann Mitarbeiter verwalten",
  ORG_USER: "Tickets bearbeiten, kein Benutzermanagement",
  ORG_GUEST: "Nur Lesen – keine Änderungen möglich",
};

const ROLE_COLOR: Record<OrgRole, string> = {
  ORG_ADMIN: "#7c3aed",
  ORG_USER: "#2563eb",
  ORG_GUEST: "#6b7280",
};

function RoleBadge({ role }: { role: OrgRole }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 12,
        background: ROLE_COLOR[role] + "18",
        color: ROLE_COLOR[role],
        border: `1px solid ${ROLE_COLOR[role]}40`,
      }}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function RoleIcon({ role }: { role: OrgRole }) {
  if (role === "ORG_ADMIN") return <ShieldCheck size={15} strokeWidth={1.75} color={ROLE_COLOR.ORG_ADMIN} />;
  if (role === "ORG_GUEST") return <Eye size={15} strokeWidth={1.75} color={ROLE_COLOR.ORG_GUEST} />;
  return <User size={15} strokeWidth={1.75} color={ROLE_COLOR.ORG_USER} />;
}

function ResetPasswordInline({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/vermieter/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: pw }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setFeedback({ type: "err", msg: data.error ?? "Fehler." });
      else { setFeedback({ type: "ok", msg: "Passwort gesetzt." }); setPw(""); setOpen(false); }
    } catch { setFeedback({ type: "err", msg: "Netzwerkfehler." }); }
    finally { setLoading(false); }
  }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "#6b7280", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6 }}>
      <KeyRound size={12} strokeWidth={1.75} /> Passwort zurücksetzen
    </button>
  );

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      <form onSubmit={submit} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input type="password" placeholder={`Neues Passwort für ${name}`} value={pw}
          onChange={e => setPw(e.target.value)} required minLength={6} autoFocus
          style={{ flex: 1, minWidth: 160, fontSize: 13, padding: "5px 10px" }} />
        <button type="submit" disabled={loading} style={{ fontSize: 13, padding: "5px 12px" }}>
          {loading ? "…" : "Setzen"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setPw(""); setFeedback(null); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}>
          <X size={14} strokeWidth={1.75} />
        </button>
      </form>
      {feedback && <p style={{ margin: 0, fontSize: 12, color: feedback.type === "err" ? "#e53e3e" : "#38a169" }}>{feedback.msg}</p>}
    </div>
  );
}

export function TeamPanel({ currentUserId }: { currentUserId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Add form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgRole, setOrgRole] = useState<OrgRole>("ORG_USER");
  const [addLoading, setAddLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      const data = (await res.json()) as { users?: TeamMember[] };
      if (res.ok) setMembers(data.users ?? []);
    } finally { setLoading(false); }
  }

  async function addMember(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, orgRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setFeedback({ type: "err", msg: data.error ?? "Fehler." }); return; }
      setFeedback({ type: "ok", msg: `${email} wurde als ${ROLE_LABELS[orgRole]} hinzugefügt.` });
      setName(""); setEmail(""); setPassword(""); setOrgRole("ORG_USER");
      setShowAdd(false);
      await load();
    } catch { setFeedback({ type: "err", msg: "Netzwerkfehler." }); }
    finally { setAddLoading(false); }
  }

  async function changeRole(id: string, newRole: OrgRole) {
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgRole: newRole }),
    });
    setMembers(prev => prev.map(m => m.id === id ? { ...m, orgRole: newRole } : m));
  }

  async function removeMember(id: string, memberName: string) {
    if (!confirm(`"${memberName}" wirklich entfernen?`)) return;
    const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-lead muted">Mitarbeiter verwalten und Berechtigungen festlegen.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowAdd(v => !v); setFeedback(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px" }}
        >
          <UserPlus size={15} strokeWidth={1.75} aria-hidden />
          Mitarbeiter hinzufügen
        </button>
      </div>

      {/* Rollen-Legende */}
      <div className="card" style={{ display: "flex", gap: 20, flexWrap: "wrap", padding: "14px 18px" }}>
        {(["ORG_ADMIN", "ORG_USER", "ORG_GUEST"] as OrgRole[]).map(r => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RoleIcon role={r} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ROLE_LABELS[r]}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{ROLE_DESC[r]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card stack">
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Neuer Mitarbeiter</h3>
          <form className="stack" onSubmit={addMember}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
              <input type="email" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <input type="password" placeholder="Passwort (min. 6 Zeichen)" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6} />

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Rolle</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["ORG_ADMIN", "ORG_USER", "ORG_GUEST"] as OrgRole[]).map(r => (
                  <label key={r} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                    borderRadius: 8, border: `2px solid ${orgRole === r ? ROLE_COLOR[r] : "var(--border, #e5e7eb)"}`,
                    background: orgRole === r ? ROLE_COLOR[r] + "10" : "transparent",
                    cursor: "pointer", fontSize: 13, fontWeight: orgRole === r ? 600 : 400,
                  }}>
                    <input type="radio" name="orgRole" value={r} checked={orgRole === r}
                      onChange={() => setOrgRole(r)} style={{ display: "none" }} />
                    <RoleIcon role={r} />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={addLoading}>
                {addLoading ? "Wird erstellt…" : "Hinzufügen"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                style={{ background: "transparent", border: "1px solid var(--border, #e5e7eb)" }}>
                Abbrechen
              </button>
            </div>
          </form>
          {feedback && (
            <p style={{ margin: 0, fontSize: 13, color: feedback.type === "err" ? "#e53e3e" : "#38a169" }}>
              {feedback.msg}
            </p>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="card stack">
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Mitarbeiter ({members.length})
        </h2>
        {loading ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Wird geladen…</p>
        ) : members.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Noch keine Mitarbeiter.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {members.map(m => (
              <div key={m.id} style={{
                padding: "12px 14px",
                background: "var(--color-surface-2, #f9fafb)",
                borderRadius: 8,
                border: "1px solid var(--color-border, #e5e7eb)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <RoleIcon role={m.orgRole} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                      <RoleBadge role={m.orgRole} />
                      {m.id === currentUserId && (
                        <span style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic" }}>(Sie)</span>
                      )}
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>{m.email}</p>

                    {m.id !== currentUserId && (
                      <>
                        {/* Role change */}
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {(["ORG_ADMIN", "ORG_USER", "ORG_GUEST"] as OrgRole[]).map(r => (
                            <button key={r} type="button"
                              onClick={() => void changeRole(m.id, r)}
                              disabled={m.orgRole === r}
                              style={{
                                fontSize: 11, padding: "3px 8px", borderRadius: 8,
                                border: `1px solid ${m.orgRole === r ? ROLE_COLOR[r] : "var(--border, #e5e7eb)"}`,
                                background: m.orgRole === r ? ROLE_COLOR[r] + "18" : "transparent",
                                color: m.orgRole === r ? ROLE_COLOR[r] : "#6b7280",
                                cursor: m.orgRole === r ? "default" : "pointer",
                                fontWeight: m.orgRole === r ? 600 : 400,
                              }}>
                              {ROLE_LABELS[r]}
                            </button>
                          ))}
                        </div>
                        <ResetPasswordInline userId={m.id} name={m.name} />
                      </>
                    )}
                  </div>

                  {m.id !== currentUserId && (
                    <button type="button" onClick={() => void removeMember(m.id, m.name)}
                      title="Mitarbeiter entfernen"
                      style={{
                        background: "none", border: "1px solid var(--color-border, #e5e7eb)",
                        borderRadius: 6, padding: "5px 8px", cursor: "pointer",
                        color: "#e53e3e", display: "inline-flex", alignItems: "center", flexShrink: 0,
                      }}>
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!showAdd && feedback && (
        <p style={{ margin: 0, fontSize: 13, color: feedback.type === "err" ? "#e53e3e" : "#38a169" }}>
          {feedback.msg}
        </p>
      )}
    </div>
  );
}

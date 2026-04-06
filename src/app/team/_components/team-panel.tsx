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
  ORG_GUEST: "Gast",
};

const ROLE_DESC: Record<OrgRole, string> = {
  ORG_ADMIN: "Vollzugriff + Benutzerverwaltung",
  ORG_USER: "Tickets bearbeiten",
  ORG_GUEST: "Nur lesen",
};

const ROLE_COLOR: Record<OrgRole, string> = {
  ORG_ADMIN: "#7c3aed",
  ORG_USER: "#2563eb",
  ORG_GUEST: "#6b7280",
};

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: color + "22", color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, fontWeight: 700, flexShrink: 0,
      border: `1.5px solid ${color}44`,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function RolePill({ role }: { role: OrgRole }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: ROLE_COLOR[role] + "15", color: ROLE_COLOR[role],
      border: `1px solid ${ROLE_COLOR[role]}33`,
    }}>
      {role === "ORG_ADMIN" ? <ShieldCheck size={10} /> : role === "ORG_GUEST" ? <Eye size={10} /> : <User size={10} />}
      {ROLE_LABELS[role]}
    </span>
  );
}

function ResetPasswordInline({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/vermieter/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: pw }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setMsg({ ok: false, text: data.error ?? "Fehler." });
      else { setMsg({ ok: true, text: "Passwort gesetzt." }); setPw(""); setOpen(false); }
    } catch { setMsg({ ok: false, text: "Netzwerkfehler." }); }
    finally { setLoading(false); }
  }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} style={{
      background: "none", border: "none", padding: 0, cursor: "pointer",
      fontSize: 12, color: "var(--muted, #6b7280)",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <KeyRound size={11} strokeWidth={1.75} /> Passwort zurücksetzen
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
      <form onSubmit={submit} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input type="password" placeholder={`Neues Passwort für ${name}`} value={pw}
          onChange={e => setPw(e.target.value)} required minLength={6} autoFocus
          style={{ flex: 1, minWidth: 160, fontSize: 13, padding: "5px 10px" }} />
        <button type="submit" disabled={loading} style={{ fontSize: 13, padding: "5px 12px" }}>
          {loading ? "…" : "Setzen"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setPw(""); setMsg(null); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex" }}>
          <X size={14} strokeWidth={1.75} />
        </button>
      </form>
      {msg && <p style={{ margin: 0, fontSize: 12, color: msg.ok ? "#16a34a" : "#dc2626" }}>{msg.text}</p>}
    </div>
  );
}

export function TeamPanel({ currentUserId }: { currentUserId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgRole, setOrgRole] = useState<OrgRole>("ORG_USER");
  const [addLoading, setAddLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

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
      if (!res.ok) { setFeedback({ ok: false, text: data.error ?? "Fehler." }); return; }
      setFeedback({ ok: true, text: `${name} wurde als ${ROLE_LABELS[orgRole]} hinzugefügt.` });
      setName(""); setEmail(""); setPassword(""); setOrgRole("ORG_USER");
      setShowAdd(false);
      await load();
    } catch { setFeedback({ ok: false, text: "Netzwerkfehler." }); }
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
    if (!confirm(`"${memberName}" wirklich aus dem Team entfernen?`)) return;
    const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-lead muted">Mitarbeiter verwalten und Berechtigungen festlegen.</p>
        </div>
        <button type="button" onClick={() => { setShowAdd(v => !v); setFeedback(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px", flexShrink: 0 }}>
          <UserPlus size={15} strokeWidth={1.75} aria-hidden />
          Mitarbeiter hinzufügen
        </button>
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
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6, color: "var(--muted, #6b7280)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rolle</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["ORG_ADMIN", "ORG_USER", "ORG_GUEST"] as OrgRole[]).map(r => (
                  <label key={r} style={{
                    flex: 1, display: "flex", flexDirection: "column", gap: 3,
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${orgRole === r ? ROLE_COLOR[r] : "var(--border, #e5e7eb)"}`,
                    background: orgRole === r ? ROLE_COLOR[r] + "08" : "transparent",
                    transition: "border-color 0.15s",
                  }}>
                    <input type="radio" name="orgRole" value={r} checked={orgRole === r}
                      onChange={() => setOrgRole(r)} style={{ display: "none" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: orgRole === r ? ROLE_COLOR[r] : "inherit" }}>
                      {ROLE_LABELS[r]}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted, #6b7280)" }}>{ROLE_DESC[r]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={addLoading}>{addLoading ? "Wird erstellt…" : "Hinzufügen"}</button>
              <button type="button" onClick={() => setShowAdd(false)}
                style={{ background: "transparent", border: "1px solid var(--border, #e5e7eb)" }}>
                Abbrechen
              </button>
            </div>
          </form>
          {feedback && (
            <p style={{ margin: 0, fontSize: 13, color: feedback.ok ? "#16a34a" : "#dc2626" }}>{feedback.text}</p>
          )}
        </div>
      )}

      {feedback && !showAdd && (
        <p style={{ margin: 0, fontSize: 13, color: feedback.ok ? "#16a34a" : "#dc2626" }}>{feedback.text}</p>
      )}

      {/* Members list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border, #e5e7eb)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Mitarbeiter</h2>
          <span className="muted" style={{ fontSize: 13 }}>{members.length} Personen</span>
        </div>

        {loading ? (
          <p className="muted" style={{ margin: 0, fontSize: 13, padding: "20px" }}>Wird geladen…</p>
        ) : members.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13, padding: "20px" }}>Noch keine Mitarbeiter.</p>
        ) : (
          <div>
            {members.map((m, idx) => (
              <div key={m.id} style={{
                padding: "14px 20px",
                borderBottom: idx < members.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <Avatar name={m.name} color={ROLE_COLOR[m.orgRole]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                    <RolePill role={m.orgRole} />
                    {m.id === currentUserId && (
                      <span style={{ fontSize: 11, color: "var(--muted, #6b7280)", fontStyle: "italic" }}>Sie</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #6b7280)" }}>{m.email}</p>
                  {m.id !== currentUserId && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {/* Role dropdown */}
                      <select value={m.orgRole} onChange={e => void changeRole(m.id, e.target.value as OrgRole)}
                        style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border, #e5e7eb)", background: "var(--card-bg, #fff)", color: "inherit", cursor: "pointer" }}>
                        {(["ORG_ADMIN", "ORG_USER", "ORG_GUEST"] as OrgRole[]).map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]} – {ROLE_DESC[r]}</option>
                        ))}
                      </select>
                      <ResetPasswordInline userId={m.id} name={m.name} />
                    </div>
                  )}
                </div>
                {m.id !== currentUserId && (
                  <button type="button" onClick={() => void removeMember(m.id, m.name)}
                    title="Mitarbeiter entfernen"
                    style={{
                      background: "none", border: "1px solid transparent", borderRadius: 6,
                      padding: "5px 7px", cursor: "pointer", color: "var(--muted, #9ca3af)",
                      display: "inline-flex", alignItems: "center", flexShrink: 0,
                      transition: "color 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted, #9ca3af)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

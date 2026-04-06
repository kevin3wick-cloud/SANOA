"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";

type TeamMember = { id: string; name: string };

type Props = {
  ticketId: string;
  assignedToId: string | null;
  assignedToName: string | null;
  teamMembers: TeamMember[];
};

export function TicketAssign({ ticketId, assignedToId, assignedToName, teamMembers }: Props) {
  const [currentId, setCurrentId] = useState<string | null>(assignedToId);
  const [currentName, setCurrentName] = useState<string | null>(assignedToName);
  const [loading, setLoading] = useState(false);

  async function assign(newId: string | null) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: newId }),
      });
      if (res.ok) {
        setCurrentId(newId);
        setCurrentName(teamMembers.find(m => m.id === newId)?.name ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
        <UserCheck size={16} strokeWidth={1.75} aria-hidden />
        Zuständig
      </h3>

      {currentId && currentName ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--accent, #2563eb)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {currentName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{currentName}</span>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Niemand zugewiesen</p>
      )}

      <select
        value={currentId ?? ""}
        onChange={e => void assign(e.target.value || null)}
        disabled={loading}
        style={{ fontSize: 13, padding: "6px 10px" }}
      >
        <option value="">— Niemand —</option>
        {teamMembers.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      {loading && <p className="muted" style={{ margin: 0, fontSize: 12 }}>Wird gespeichert…</p>}
    </div>
  );
}

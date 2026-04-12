"use client";

import { useState } from "react";
import { TicketStatus } from "@prisma/client";

type TeamMember = { id: string; name: string };

type Props = {
  ticketId: string;
  currentStatus: TicketStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  teamMembers: TeamMember[];
};

const STATUS_OPTIONS = [
  { value: "OPEN",        label: "Offen" },
  { value: "IN_PROGRESS", label: "In Bearbeitung" },
  { value: "DONE",        label: "Erledigt" },
];

export function TicketSidebar({
  ticketId,
  currentStatus,
  assignedToId,
  assignedToName,
  teamMembers,
}: Props) {
  const [status, setStatus]     = useState<TicketStatus>(currentStatus);
  const [assignId, setAssignId] = useState<string>(assignedToId ?? "");
  const [saving, setSaving]     = useState(false);

  async function saveStatus(next: TicketStatus) {
    setStatus(next);
    setSaving(true);
    try {
      await fetch(`/api/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setTimeout(() => window.location.reload(), 300);
    } finally {
      setSaving(false);
    }
  }

  async function saveAssign(newId: string) {
    setAssignId(newId);
    setSaving(true);
    try {
      await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: newId || null }),
      });
    } finally {
      setSaving(false);
    }
  }

  const assignedName = teamMembers.find((m) => m.id === assignId)?.name ?? assignedToName;

  return (
    <div className="card stack" style={{ gap: 14 }}>
      {/* Status */}
      <div>
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Status {saving && <span style={{ fontWeight: 400, opacity: 0.5 }}>·  wird gespeichert…</span>}
        </p>
        <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => void saveStatus(opt.value as TicketStatus)}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: status === opt.value ? "var(--accent)" : "var(--border)",
                background: status === opt.value ? "var(--accent-dim)" : "transparent",
                color: status === opt.value ? "var(--accent)" : "var(--text)",
                fontWeight: status === opt.value ? 700 : 400,
                fontSize: 13,
                textAlign: "left",
                cursor: saving ? "wait" : "pointer",
                transition: "border-color 0.1s, background 0.1s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)" }} />

      {/* Zuständig */}
      <div>
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Zuständig
        </p>
        {assignId && assignedName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {assignedName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{assignedName}</span>
          </div>
        ) : (
          <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>Niemand zugewiesen</p>
        )}
        <select
          value={assignId}
          disabled={saving}
          onChange={(e) => void saveAssign(e.target.value)}
          style={{ fontSize: 13, width: "100%" }}
        >
          <option value="">— Niemand —</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

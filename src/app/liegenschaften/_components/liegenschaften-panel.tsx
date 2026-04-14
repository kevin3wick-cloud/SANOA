"use client";

import { useState } from "react";
import { Building2, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";

type TeamMember = { id: string; name: string; email: string };
type Property = {
  id: string;
  name: string;
  address: string | null;
  assigneeUsers: TeamMember[];
  _count: { tenants: number };
};

export function LiegenschaftenPanel({
  initialProperties,
  teamMembers,
}: {
  initialProperties: Property[];
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  async function addProperty() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), address: newAddress.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fehler."); return; }
      setProperties(prev => [...prev, { ...data, assigneeUsers: [], _count: { tenants: 0 } }]);
      setNewName(""); setNewAddress(""); setShowAdd(false);
    } finally { setSaving(false); }
  }

  async function deleteProperty(id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen? Die Mieter verlieren ihre Liegenschaftszuweisung.`)) return;
    await fetch(`/api/properties/${id}`, { method: "DELETE" });
    setProperties(prev => prev.filter(p => p.id !== id));
  }

  async function addAssignee(propertyId: string, userId: string) {
    if (!userId) return;
    const res = await fetch(`/api/properties/${propertyId}/assignees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return;
    const member = teamMembers.find(m => m.id === userId);
    if (!member) return;
    setProperties(prev => prev.map(p =>
      p.id === propertyId && !p.assigneeUsers.find(u => u.id === userId)
        ? { ...p, assigneeUsers: [...p.assigneeUsers, member] }
        : p
    ));
  }

  async function removeAssignee(propertyId: string, userId: string) {
    await fetch(`/api/properties/${propertyId}/assignees`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setProperties(prev => prev.map(p =>
      p.id === propertyId
        ? { ...p, assigneeUsers: p.assigneeUsers.filter(u => u.id !== userId) }
        : p
    ));
  }


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Properties list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Liegenschaften</h2>
          <button
            type="button"
            onClick={() => setShowAdd(v => !v)}
            style={{ width: "auto", fontSize: 13, padding: "7px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={14} /> Neue Liegenschaft
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input
                type="text" placeholder="Name (z.B. Musterstrasse 1)"
                value={newName} onChange={e => setNewName(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <input
                type="text" placeholder="Adresse (optional)"
                value={newAddress} onChange={e => setNewAddress(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            {error && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#f87171" }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={addProperty} disabled={saving || !newName.trim()}
                style={{ width: "auto", fontSize: 13, padding: "7px 14px" }}>
                {saving ? "Wird erstellt…" : "Erstellen"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                style={{ width: "auto", fontSize: 13, padding: "7px 14px", background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {properties.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <Building2 size={32} style={{ color: "var(--muted)", margin: "0 auto 12px", display: "block" }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Noch keine Liegenschaften erfasst.</p>
          </div>
        ) : (
          <div>
            {properties.map((prop, idx) => (
              <PropertyRow
                key={prop.id}
                property={prop}
                teamMembers={teamMembers}
                isLast={idx === properties.length - 1}
                onDelete={() => deleteProperty(prop.id, prop.name)}
                onAddAssignee={(uid) => addAssignee(prop.id, uid)}
                onRemoveAssignee={(uid) => removeAssignee(prop.id, uid)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyRow({
  property, teamMembers, isLast, onDelete, onAddAssignee, onRemoveAssignee,
}: {
  property: Property;
  teamMembers: TeamMember[];
  isLast: boolean;
  onDelete: () => void;
  onAddAssignee: (uid: string) => void;
  onRemoveAssignee: (uid: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const unassigned = teamMembers.filter(m => !property.assigneeUsers.find(u => u.id === m.id));

  return (
    <div style={{
      padding: "16px 20px",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Building2 size={18} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{property.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
            {property.address ? `${property.address} · ` : ""}
            {property._count.tenants} Mieter
          </p>
        </div>
        <button type="button" onClick={onDelete}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--muted)", flexShrink: 0 }}
          title="Liegenschaft löschen">
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Assignees */}
      <div style={{ marginTop: 12, marginLeft: 50 }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          Zuständig
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {property.assigneeUsers.map(u => (
            <span key={u.id} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, padding: "4px 10px", borderRadius: 20,
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              {u.name}
              <button type="button" onClick={() => onRemoveAssignee(u.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted)", display: "inline-flex" }}>
                <X size={11} />
              </button>
            </span>
          ))}

          {/* Add assignee */}
          {!showPicker && unassigned.length > 0 && (
            <button type="button" onClick={() => setShowPicker(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, padding: "4px 10px", borderRadius: 20,
                background: "transparent", border: "1px dashed var(--border)",
                cursor: "pointer", color: "var(--muted)",
              }}>
              <UserPlus size={11} /> Mitarbeiter hinzufügen
            </button>
          )}

          {showPicker && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                autoFocus
                defaultValue=""
                onChange={e => { if (e.target.value) { onAddAssignee(e.target.value); setShowPicker(false); } }}
                style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, width: "auto" }}
              >
                <option value="">Person wählen…</option>
                {unassigned.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowPicker(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--muted)" }}>
                <X size={13} />
              </button>
            </div>
          )}

          {property.assigneeUsers.length === 0 && !showPicker && (
            <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
              Noch niemand zugewiesen — Tickets werden nicht automatisch zugeteilt
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

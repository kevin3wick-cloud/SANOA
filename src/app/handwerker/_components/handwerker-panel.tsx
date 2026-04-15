"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X, Wrench } from "lucide-react";

const TRADES = [
  "Sanitär", "Elektro", "Heizung", "Schlosserei", "Maler",
  "Schreiner", "Dach", "Lift", "Gartenpflege", "Reinigung", "Sonstiges"
];

type Contractor = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  trade: string | null;
};

export function HandwerkerPanel({ initialContractors }: { initialContractors: Contractor[] }) {
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>(initialContractors);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", trade: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contractor>>({});
  const [error, setError] = useState("");

  async function addContractor() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fehler."); return; }
      setContractors(prev => [...prev, data]);
      setForm({ name: "", email: "", phone: "", trade: "" });
      setShowAdd(false);
      router.refresh();
    } finally { setSaving(false); }
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/contractors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setContractors(prev => prev.map(c => c.id === id ? data : c));
        setEditId(null);
      }
    } finally { setSaving(false); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    setContractors(prev => prev.filter(c => c.id !== id));
  }

  // Group by trade
  const grouped = contractors.reduce<Record<string, Contractor[]>>((acc, c) => {
    const key = c.trade || "Sonstiges";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Add button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setShowAdd(v => !v)}
          style={{ width: "auto", fontSize: 13, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Handwerker hinzufügen
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card stack">
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Neuer Handwerker</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 13 }} autoComplete="off" />
            <input placeholder="E-Mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ fontSize: 13 }} autoComplete="off" />
            <input placeholder="Telefon (optional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ fontSize: 13 }} />
            <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} style={{ fontSize: 13 }}>
              <option value="">Fachbereich wählen…</option>
              {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={addContractor} disabled={saving || !form.name.trim() || !form.email.trim()}
              style={{ width: "auto", fontSize: 13, padding: "8px 14px" }}>
              {saving ? "Wird erstellt…" : "Speichern"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              style={{ width: "auto", fontSize: 13, padding: "8px 14px", background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* List grouped by trade */}
      {contractors.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <Wrench size={32} style={{ color: "var(--muted)", margin: "0 auto 12px", display: "block" }} />
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            Noch keine Handwerker erfasst. Füge Handwerker hinzu, damit der KI-Agent Tickets automatisch weiterleiten kann.
          </p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([trade, list]) => (
          <div key={trade} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Wrench size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{trade}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>{list.length}</span>
            </div>
            {list.map((c, idx) => (
              <div key={c.id} style={{
                padding: "14px 20px",
                borderBottom: idx < list.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                {editId === c.id ? (
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input defaultValue={c.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 13 }} />
                    <input defaultValue={c.email} type="email" onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={{ fontSize: 13 }} />
                    <input defaultValue={c.phone ?? ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefon" style={{ fontSize: 13 }} />
                    <select defaultValue={c.trade ?? ""} onChange={e => setEditForm(f => ({ ...f, trade: e.target.value }))} style={{ fontSize: 13 }}>
                      <option value="">Fachbereich…</option>
                      {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 6, gridColumn: "1/-1" }}>
                      <button type="button" onClick={() => saveEdit(c.id)} disabled={saving}
                        style={{ width: "auto", fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Check size={13} /> Speichern
                      </button>
                      <button type="button" onClick={() => setEditId(null)}
                        style={{ width: "auto", fontSize: 12, padding: "6px 12px", background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{c.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={() => { setEditId(c.id); setEditForm({ name: c.name, email: c.email, phone: c.phone ?? "", trade: c.trade ?? "" }); }}
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "var(--muted)", display: "inline-flex" }}>
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={() => remove(c.id, c.name)}
                        style={{ background: "none", border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "var(--muted)", display: "inline-flex" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#f8717144"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

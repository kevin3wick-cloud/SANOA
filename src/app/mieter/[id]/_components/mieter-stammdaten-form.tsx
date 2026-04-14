"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";

type Property = { id: string; name: string };

type Props = {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  apartment: string;
  archivedAt: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  properties?: Property[];
};

export function MieterStammdatenForm({ tenantId, name, email, phone, apartment, archivedAt, propertyId, propertyName, properties = [] }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({ name, email, phone, apartment, propertyId: propertyId ?? "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setValues({ name, email, phone, apartment, propertyId: propertyId ?? "" });
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/mieter/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, propertyId: values.propertyId || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Speichern.");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, key: keyof typeof values, type = "text") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--muted)" }}>{label}</label>
      <input
        type={type}
        value={values[key]}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        disabled={loading}
        required={key !== "phone"}
        style={{ fontSize: 14 }}
      />
    </div>
  );

  if (editing) {
    return (
      <div className="card stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Stammdaten bearbeiten</h3>
          <button
            type="button"
            onClick={cancelEdit}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)" }}
            aria-label="Abbrechen"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          {field("Name", "name")}
          {field("E-Mail", "email", "email")}
          {field("Telefon", "phone", "tel")}
          {field("Wohnung / Bezeichnung", "apartment")}
          {properties.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>Liegenschaft</label>
              <select
                value={values.propertyId}
                onChange={e => setValues(v => ({ ...v, propertyId: e.target.value }))}
                disabled={loading}
                style={{ fontSize: 14 }}
              >
                <option value="">— Keine Liegenschaft —</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={loading} style={{ flex: 1 }}>
              <Check size={14} strokeWidth={2.5} style={{ marginRight: 6 }} aria-hidden />
              {loading ? "Wird gespeichert…" : "Speichern"}
            </button>
            <button type="button" onClick={cancelEdit} style={{ flex: 1 }} disabled={loading}>
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Read-only view with edit button
  return (
    <div className="card stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 10, flex: 1 }}>
          <Row label="Name" value={name} />
          <Row label="E-Mail" value={email} />
          <Row label="Telefon" value={phone || "—"} />
          <Row label="Wohnung" value={apartment} />
          <Row label="Liegenschaft" value={propertyName || "—"} />
          {archivedAt && (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Archiviert am {new Date(archivedAt).toLocaleDateString("de-CH")} – kein Mieter-Portal-Zugang.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={startEdit}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            cursor: "pointer",
            padding: "6px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--muted)",
            width: "auto",
            flexShrink: 0,
            marginLeft: 16,
          }}
          title="Stammdaten bearbeiten"
        >
          <Pencil size={13} strokeWidth={2} aria-hidden />
          Bearbeiten
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ margin: 0, fontSize: 14 }}>
      <span style={{ fontWeight: 600, marginRight: 6 }}>{label}:</span>
      <span style={{ color: "var(--muted)" }}>{value}</span>
    </p>
  );
}

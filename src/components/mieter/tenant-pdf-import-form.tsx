"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles, User } from "lucide-react";

type Extracted = {
  name: string | null;
  email: string | null;
  phone: string | null;
  apartment: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  propertyName: string | null;
  monthlyRent: number | null;
  deposit: number | null;
  notes: string | null;
};

type PreviewData = {
  extracted: Extracted;
  matchedProperty: { id: string; name: string } | null;
  existingTenant: { id: string; name: string; leaseEnd: string | null } | null;
};

type Property = { id: string; name: string };

export function TenantPdfImportForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; email: string; password: string } | null>(null);

  // Fields user can override before confirming
  const [password, setPassword] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [existingLeaseEnd, setExistingLeaseEnd] = useState("");

  function reset() {
    setPreview(null); setError(""); setDone(null);
    setPassword(""); setPropertyId(""); setExistingLeaseEnd("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Bitte eine PDF-Datei wählen."); return; }

    setError(""); setLoading(true); setPreview(null);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      const res = await fetch("/api/mieter/import-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fehler beim Lesen."); return; }
      setPreview(data);
      setPropertyId(data.matchedProperty?.id ?? "");
      setExistingLeaseEnd(data.existingTenant?.leaseEnd
        ? new Date(data.existingTenant.leaseEnd).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\./g, ".")
        : "");
    } finally { setLoading(false); }
  }

  async function confirm() {
    if (!preview) return;
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      // Re-upload the file
      const fileInput = fileRef.current;
      if (!fileInput?.files?.[0]) { setError("Datei nicht mehr verfügbar. Bitte erneut hochladen."); return; }
      fd.append("pdf", fileInput.files[0]);
      fd.append("confirm", "true");
      fd.append("password", password || "");
      fd.append("propertyId", propertyId || "");
      if (preview.existingTenant && existingLeaseEnd) {
        fd.append("existingTenantId", preview.existingTenant.id);
        fd.append("existingLeaseEnd", existingLeaseEnd);
      }

      const res = await fetch("/api/mieter/import-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fehler beim Anlegen."); return; }
      setDone({ name: data.name, email: data.email, password: data.password });
      router.refresh();
    } finally { setLoading(false); }
  }

  const ext = preview?.extracted;

  return (
    <div className="card stack">
      {/* Toggle */}
      <button type="button" onClick={() => { setOpen(v => !v); if (!open) reset(); }}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={18} strokeWidth={1.75} style={{ color: "var(--accent)" }} aria-hidden />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Mietvertrag hochladen (KI liest aus)</span>
        </div>
        {open ? <ChevronUp size={16} style={{ color: "var(--muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--muted)" }} />}
      </button>

      {open && (
        <>
          {/* Success */}
          {done ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#34d399", fontWeight: 600 }}>
                <CheckCircle size={18} /> Mieter "{done.name}" wurde angelegt
              </div>
              <div style={{ background: "var(--surface)", borderRadius: 8, padding: "12px 14px", fontSize: 13 }}>
                <p style={{ margin: "0 0 4px" }}>Login für Mieter-Portal:</p>
                <p style={{ margin: 0, color: "var(--muted)" }}>E-Mail: <strong>{done.email}</strong></p>
                <p style={{ margin: 0, color: "var(--muted)" }}>Passwort: <strong>{done.password}</strong></p>
              </div>
              <button type="button" onClick={reset} style={{ width: "auto", fontSize: 13, padding: "8px 14px", alignSelf: "flex-start" }}>
                Weiteren Vertrag hochladen
              </button>
            </div>
          ) : (
            <>
              {/* Upload area */}
              {!preview && (
                <div style={{
                  border: "2px dashed var(--border)", borderRadius: 10, padding: "28px 20px",
                  textAlign: "center", cursor: "pointer",
                  background: loading ? "var(--surface)" : "transparent",
                  transition: "background 0.15s",
                }}
                  onClick={() => fileRef.current?.click()}>
                  <FileText size={32} style={{ color: "var(--muted)", margin: "0 auto 10px", display: "block" }} />
                  <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14 }}>
                    {loading ? "KI liest Vertrag aus…" : "PDF-Mietvertrag hochladen"}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                    {loading ? "Einen Moment bitte…" : "Klicken um Datei zu wählen · max. 10 MB"}
                  </p>
                  <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile}
                    style={{ display: "none" }} disabled={loading} />
                </div>
              )}

              {error && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#f87171", fontSize: 13 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                </div>
              )}

              {/* Preview */}
              {preview && ext && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>KI hat folgende Daten erkannt — bitte prüfen:</p>
                  </div>

                  {/* Extracted data display */}
                  <div style={{ background: "var(--surface)", borderRadius: 10, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      ["Name", ext.name],
                      ["E-Mail", ext.email],
                      ["Telefon", ext.phone],
                      ["Wohnung", ext.apartment],
                      ["Mietbeginn", ext.leaseStart],
                      ["Mietende", ext.leaseEnd ?? "Unbefristet"],
                      ["Liegenschaft", ext.propertyName],
                      ["Miete", ext.monthlyRent ? `CHF ${ext.monthlyRent}/Mt.` : null],
                    ].map(([label, value]) => value ? (
                      <div key={label as string}>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500 }}>{value}</p>
                      </div>
                    ) : null)}
                  </div>

                  {ext.notes && (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                      📋 {ext.notes}
                    </p>
                  )}

                  {/* Existing tenant warning */}
                  {preview.existingTenant && (
                    <div style={{ background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <User size={14} style={{ color: "#fbbf24" }} />
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#fbbf24" }}>
                          Bestehender Mieter in dieser Wohnung: {preview.existingTenant.name}
                        </p>
                      </div>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)" }}>
                        Mietende setzen damit der neue Mieter einziehen kann:
                      </p>
                      <input
                        type="text"
                        placeholder="Auszugsdatum TT.MM.JJJJ"
                        value={existingLeaseEnd}
                        onChange={e => setExistingLeaseEnd(e.target.value)}
                        style={{ fontSize: 13, padding: "7px 10px", width: "100%" }}
                      />
                    </div>
                  )}

                  {/* Property assignment */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                      Liegenschaft zuweisen
                      {preview.matchedProperty && <span style={{ color: "#34d399", marginLeft: 8 }}>· KI hat "{preview.matchedProperty.name}" erkannt</span>}
                    </label>
                    <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ fontSize: 13, width: "100%" }}>
                      <option value="">— Keine Liegenschaft —</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                      Passwort für Mieter-Portal
                    </label>
                    <input
                      type="text" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Leer lassen → wird automatisch generiert"
                      style={{ fontSize: 13, width: "100%" }}
                      autoComplete="off"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={confirm} disabled={loading}
                      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <CheckCircle size={15} />
                      {loading ? "Wird angelegt…" : "Mieter anlegen"}
                    </button>
                    <button type="button" onClick={reset} disabled={loading}
                      style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

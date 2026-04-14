"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { ImportRow, ImportResult } from "@/app/api/mieter/import/route";

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, "");
  return clean
    .split(/\r?\n/)
    .map((line) =>
      // Handle semicolon or comma separator
      line.split(/;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) =>
        cell.trim().replace(/^"(.*)"$/, "$1")
      )
    )
    .filter((row) => row.some((cell) => cell.length > 0));
}

function rowsToImportData(rows: string[][]): ImportRow[] {
  if (rows.length < 2) return [];
  // Skip header row (row 0)
  return rows.slice(1).map((cols) => ({
    name:         cols[0] ?? "",
    email:        cols[1] ?? "",
    phone:        cols[2] ?? "",
    apartment:    cols[3] ?? "",
    password:     cols[4] ?? "",
    leaseStart:   cols[5] ?? "",
    leaseEnd:     cols[6] ?? "",
    propertyName: cols[7] ?? "",
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "idle" | "preview" | "importing" | "done";

export function TenantImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<{ created: number; failed: number } | null>(null);

  function reset() {
    setPhase("idle");
    setPreviewRows([]);
    setFileError(null);
    setResults([]);
    setSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setPhase("idle");

    if (!file.name.endsWith(".csv")) {
      setFileError("Bitte eine CSV-Datei hochladen (.csv). In Excel: Datei → Speichern unter → CSV (Semikolon-getrennt).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      const importRows = rowsToImportData(parsed);
      if (importRows.length === 0) {
        setFileError("Die Datei enthält keine Datenzeilen.");
        return;
      }
      if (importRows.length > 200) {
        setFileError("Maximal 200 Mieter pro Import.");
        return;
      }
      setPreviewRows(importRows);
      setPhase("preview");
    };
    reader.readAsText(file, "utf-8");
  }

  async function runImport() {
    setPhase("importing");
    try {
      const res = await fetch("/api/mieter/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: previewRows }),
      });
      const data = (await res.json()) as {
        created: number;
        failed: number;
        results: ImportResult[];
      };
      setResults(data.results);
      setSummary({ created: data.created, failed: data.failed });
      setPhase("done");
      if (data.created > 0) router.refresh();
    } catch {
      setFileError("Netzwerkfehler. Bitte erneut versuchen.");
      setPhase("preview");
    }
  }

  return (
    <div className="card stack">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) reset(); }}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Upload size={18} strokeWidth={1.75} aria-hidden />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Mieter per CSV importieren</span>
        </div>
        {open
          ? <ChevronUp size={16} style={{ color: "var(--muted)" }} />
          : <ChevronDown size={16} style={{ color: "var(--muted)" }} />}
      </button>

      {open && (
        <>
          {/* Template download */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <a
              href="/api/mieter/import-template"
              download
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, color: "var(--accent)", textDecoration: "none",
                padding: "5px 12px", borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <Download size={14} strokeWidth={2} aria-hidden />
              Vorlage herunterladen (.csv)
            </a>
            <span className="muted" style={{ fontSize: 12 }}>
              In Excel ausfüllen → Speichern als CSV → hochladen
            </span>
          </div>

          {/* Expected columns hint */}
          <div style={{
            background: "var(--surface)", borderRadius: 8, padding: "10px 14px",
            fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
          }}>
            <strong style={{ color: "inherit" }}>Spalten (Semikolon-getrennt):</strong>{" "}
            Name · E-Mail · Telefon · Wohnung · Passwort · Mietbeginn (TT.MM.JJJJ) · Mietende (optional) · Liegenschaft (optional)
          </div>

          {/* File input */}
          {phase !== "done" && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                style={{ fontSize: 13 }}
              />
            </div>
          )}

          {fileError && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#f87171", fontSize: 13 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {fileError}
            </div>
          )}

          {/* Preview table */}
          {phase === "preview" && previewRows.length > 0 && (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                Vorschau – {previewRows.length} Zeile{previewRows.length !== 1 ? "n" : ""} erkannt:
              </p>
              <div className="table-wrap">
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>E-Mail</th>
                      <th>Telefon</th>
                      <th>Wohnung</th>
                      <th>Mietbeginn</th>
                      <th>Mietende</th>
                      <th>Liegenschaft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        <td className="muted">{i + 2}</td>
                        <td>{row.name || <span style={{ color: "#f87171" }}>—</span>}</td>
                        <td>{row.email || <span style={{ color: "#f87171" }}>—</span>}</td>
                        <td>{row.phone || "—"}</td>
                        <td>{row.apartment || <span style={{ color: "#f87171" }}>—</span>}</td>
                        <td>{row.leaseStart || <span style={{ color: "#f87171" }}>—</span>}</td>
                        <td className="muted">{row.leaseEnd || "—"}</td>
                        <td className="muted">{row.propertyName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={runImport} style={{ flex: 1 }}>
                  <Upload size={14} strokeWidth={2} style={{ marginRight: 6 }} aria-hidden />
                  {previewRows.length} Mieter importieren
                </button>
                <button type="button" onClick={reset} style={{ flex: 1 }}>
                  Abbrechen
                </button>
              </div>
            </>
          )}

          {phase === "importing" && (
            <p className="muted" style={{ fontSize: 13 }}>Wird importiert…</p>
          )}

          {/* Results */}
          {phase === "done" && summary && (
            <>
              <div style={{
                display: "flex", gap: 16, flexWrap: "wrap",
                padding: "12px 16px", background: "var(--surface)", borderRadius: 10,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#34d399", fontWeight: 700, fontSize: 14 }}>
                  <CheckCircle size={16} /> {summary.created} importiert
                </span>
                {summary.failed > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171", fontWeight: 700, fontSize: 14 }}>
                    <XCircle size={16} /> {summary.failed} fehlgeschlagen
                  </span>
                )}
              </div>

              {results.filter((r) => !r.ok).length > 0 && (
                <div className="table-wrap">
                  <table className="table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Zeile</th>
                        <th>Name</th>
                        <th>Fehler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.filter((r) => !r.ok).map((r) => (
                        <tr key={r.row}>
                          <td className="muted">{r.row}</td>
                          <td>{r.name}</td>
                          <td style={{ color: "#f87171" }}>{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button type="button" onClick={reset} style={{ alignSelf: "flex-start" }}>
                Neuer Import
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

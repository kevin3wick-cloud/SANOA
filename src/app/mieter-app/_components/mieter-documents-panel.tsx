"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Document, DocumentKind } from "@prisma/client";
import { formatDate, formatDocumentKind } from "@/lib/format";

type DocumentRow = Omit<Document, "createdAt" | "archivedAt"> & {
  createdAt: string;
  archivedAt: string | null;
};

type FilterValue = "current" | "archive" | "all" | "all-tenants";

const DOCUMENT_FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "current", label: "Aktuell" },
  { value: "archive", label: "Archiv" },
  { value: "all", label: "Alle" },
  { value: "all-tenants", label: "Alle Mieter" }
];

export function MieterDocumentsPanel() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>("current");
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/mieter-app/documents?filter=${encodeURIComponent(filter)}`,
          { credentials: "include" }
        );
        const data = (await response.json()) as DocumentRow[] | { error?: string };
        if (response.status === 401) {
          if (!cancelled) router.replace("/mieter-app/login");
          return;
        }
        if (!response.ok) {
          if (!cancelled) {
            setError(
              "error" in data && data.error
                ? data.error
                : "Dokumente konnten nicht geladen werden."
            );
            setDocs([]);
          }
          return;
        }
        if (!cancelled) {
          setDocs(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Netzwerkfehler.");
          setDocs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, router]);

  return (
    <div className="card stack">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>News & Dokumente</h3>
        <label className="muted" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span>Anzeige</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterValue)}
            style={{ width: "auto", minWidth: 120 }}
          >
            {DOCUMENT_FILTER_OPTIONS.map(({ value, label }) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {filter === "current"
          ? "Aktuelle Unterlagen von Ihrer Verwaltung."
          : filter === "archive"
            ? "Ältere Versionen (automatisch archiviert, sobald etwas Neues hochgeladen wird)."
            : filter === "all-tenants"
              ? "Allgemeine Unterlagen für alle Mieter (nicht nur für Ihre Wohnung)."
              : "Alle für Sie freigegebenen Dokumente."}
      </p>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Hinweis: Es erscheinen nur PDFs, die die Verwaltung als „Für Mieter sichtbar“ hochlädt und
        Ihnen oder allen Mietern zuordnet.
      </p>
      {error && <p className="muted">{error}</p>}
      {docs === null && !error && <p className="muted">Lade Dokumente …</p>}
      {docs && docs.length === 0 && !error && (
        <p className="muted">Keine Einträge für diese Ansicht.</p>
      )}
      {docs && docs.length > 0 && (
        <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 10 }}>
          {docs.map((d) => (
            <li
              key={d.id}
              className="ticket-note-item"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
              <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
                {formatDocumentKind(d.kind as DocumentKind)} · {formatDate(new Date(d.createdAt))}
                {d.archivedAt ? (
                  <>
                    {" "}
                    · <span className="muted">Archiv</span>
                  </>
                ) : null}
              </p>
              <a className="table-link" href={d.fileUrl} target="_blank" rel="noreferrer">
                Öffnen / Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Document, DocumentKind } from "@prisma/client";
import { formatDate, formatDocumentKind } from "@/lib/format";
import { MessageCircle, Send, CheckCircle } from "lucide-react";

function DocumentCard({ doc }: { doc: DocumentRow }) {
  const [showQ, setShowQ] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submitQuestion() {
    if (!question.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/mieter-app/documents/${doc.id}/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      setSent(true);
      setQuestion("");
      setShowQ(false);
    } finally { setSending(false); }
  }

  return (
    <div style={{ borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Document row */}
      <a href={doc.fileUrl} target="_blank" rel="noreferrer"
        style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", padding: "12px 14px" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 16 }}>📄</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {doc.name}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            {formatDocumentKind(doc.kind as DocumentKind)} · {formatDate(new Date(doc.createdAt))}
          </p>
        </div>
        <span style={{ fontSize: 18, color: "var(--muted)", flexShrink: 0 }}>›</span>
      </a>

      {/* Question button / form */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "8px 14px" }}>
        {!showQ && !sent && (
          <button type="button" onClick={() => setShowQ(true)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5,
            }}>
            <MessageCircle size={13} strokeWidth={1.75} /> Frage stellen
          </button>
        )}
        {sent && (
          <span style={{ fontSize: 12, color: "#34d399", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <CheckCircle size={13} /> Frage gesendet — die Verwaltung antwortet in Kuerze
          </span>
        )}
        {showQ && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <textarea
              autoFocus
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ihre Frage zu diesem Dokument…"
              rows={2}
              style={{
                flex: 1, fontSize: 13, padding: "8px 10px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--bg)",
                color: "var(--text)", resize: "none",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button type="button" onClick={submitQuestion} disabled={sending || !question.trim()}
                style={{
                  padding: "8px 10px", borderRadius: 8, border: "none",
                  background: "var(--accent)", color: "#fff", cursor: "pointer",
                  display: "inline-flex", alignItems: "center",
                }}>
                <Send size={14} />
              </button>
              <button type="button" onClick={() => { setShowQ(false); setQuestion(""); }}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11 }}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

export function MieterDocumentsPanel({ compact = false }: { compact?: boolean }) {
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
    <div className={compact ? "" : "card stack"} style={compact ? { display: "flex", flexDirection: "column", gap: 10 } : undefined}>
      {/* Filter row — compact hides the title (parent renders it) */}
      {!compact && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>News & Dokumente</h3>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Ansicht</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterValue)}
          style={{ width: "auto", minWidth: 100, fontSize: 13, padding: "5px 8px" }}
        >
          {DOCUMENT_FILTER_OPTIONS.map(({ value, label }) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>}
      {docs === null && !error && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Lade …</p>}
      {docs && docs.length === 0 && !error && (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Keine Dokumente vorhanden.</p>
      )}
      {docs && docs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map((d) => (
            <DocumentCard key={d.id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}

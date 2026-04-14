"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send, Trash2, FileText } from "lucide-react";

type Question = {
  id: string;
  question: string;
  createdAt: string;
  tenantName: string;
  documentId: string;
  documentName: string;
};

export function DocumentQuestionsPanel({ questions: initial }: { questions: Question[] }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initial);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  async function sendAnswer(id: string) {
    const answer = answers[id]?.trim();
    if (!answer) return;
    setSending(id);
    try {
      const res = await fetch(`/api/documents/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== id));
        setAnswers(prev => { const n = { ...prev }; delete n[id]; return n; });
        router.refresh();
      }
    } finally { setSending(null); }
  }

  async function dismiss(id: string) {
    await fetch(`/api/documents/questions/${id}`, { method: "DELETE" });
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  if (questions.length === 0) return null;

  return (
    <div style={{
      background: "color-mix(in srgb, var(--accent) 6%, transparent)",
      border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      borderRadius: 12, padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MessageCircle size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          {questions.length === 1 ? "1 offene Frage" : `${questions.length} offene Fragen`} zu Dokumenten
        </h2>
      </div>

      {questions.map((q) => (
        <div key={q.id} style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <FileText size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <a href={`/api/documents/${q.documentId}/file`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                  {q.documentName}
                </a>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>· {q.tenantName}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                {q.question}
              </p>
            </div>
            <button type="button" onClick={() => dismiss(q.id)}
              title="Frage verwerfen"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", flexShrink: 0 }}>
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          </div>

          {/* Answer form */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Antwort eingeben…"
              value={answers[q.id] ?? ""}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") void sendAnswer(q.id); }}
              style={{ flex: 1, fontSize: 13, padding: "8px 12px", margin: 0 }}
            />
            <button
              type="button"
              onClick={() => void sendAnswer(q.id)}
              disabled={!answers[q.id]?.trim() || sending === q.id}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: "var(--accent)", color: "#fff", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 600, opacity: sending === q.id ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              <Send size={13} />
              {sending === q.id ? "…" : "Antworten"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

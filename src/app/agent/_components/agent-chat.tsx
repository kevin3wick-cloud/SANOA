"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Send, User, ChevronDown, ChevronUp, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; text: string };
type ToolCall = { tool: string; result: string };

const STORAGE_KEY = "sanoa_agent_chat";
const INITIAL_MESSAGE: Message = {
  role: "assistant",
  text: "Hallo! Ich bin dein KI-Agent. Ich kann Mieter anlegen, Liegenschaften verwalten, Handwerker kontaktieren und vieles mehr.\n\nWas kann ich für dich tun?",
};

const EXAMPLES = [
  "Leg eine neue Liegenschaft 'Bahnhofstrasse 12' an",
  "Zeige mir alle Liegenschaften",
  "Welche Handwerker sind hinterlegt?",
  "Liste alle offenen Tickets",
  "Leg Max Muster als Mieter an: max@beispiel.ch, 079 123 45 67, Wohnung 2. OG, Mietbeginn 01.06.2026, Passwort: Sanoa2026",
];

export function AgentChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolLog, setToolLog] = useState<ToolCall[]>([]);
  const [showTools, setShowTools] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { messages: savedMessages, toolLog: savedToolLog } = JSON.parse(saved);
        if (savedMessages?.length > 0) setMessages(savedMessages);
        if (savedToolLog?.length > 0) { setToolLog(savedToolLog); setShowTools(false); }
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Save to localStorage whenever messages or toolLog change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, toolLog }));
    } catch { /* ignore */ }
  }, [messages, toolLog, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const userText = text ?? input.trim();
    if (!userText || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
      }
      if (data.toolLog?.length > 0) {
        setToolLog(prev => [...prev, ...data.toolLog]);
        setShowTools(true);
        // Refresh page data after agent actions
        router.refresh();
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Fehler beim Verbinden. Bitte erneut versuchen." }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  function clearChat() {
    setMessages([INITIAL_MESSAGE]);
    setToolLog([]);
    setShowTools(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={clearChat}
          style={{
            fontSize: 12, padding: "5px 12px", borderRadius: 20,
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--muted)", cursor: "pointer",
          }}>
          Chat leeren
        </button>
      </div>

      {/* Chat window */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "20px", minHeight: 420,
        display: "flex", flexDirection: "column", gap: 16,
        maxHeight: 560, overflowY: "auto",
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex", gap: 12,
            flexDirection: m.role === "user" ? "row-reverse" : "row",
            alignItems: "flex-start",
          }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: m.role === "assistant"
                ? "color-mix(in srgb, var(--accent) 20%, transparent)"
                : "color-mix(in srgb, #6b7280 20%, transparent)",
            }}>
              {m.role === "assistant"
                ? <Bot size={16} style={{ color: "var(--accent)" }} />
                : <User size={16} style={{ color: "var(--muted)" }} />}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: "80%",
              background: m.role === "assistant" ? "var(--bg)" : "var(--accent)",
              color: m.role === "assistant" ? "var(--text)" : "#fff",
              border: m.role === "assistant" ? "1px solid var(--border)" : "none",
              borderRadius: m.role === "assistant" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
              padding: "10px 14px",
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "color-mix(in srgb, var(--accent) 20%, transparent)",
            }}>
              <Bot size={16} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{
              padding: "12px 16px", borderRadius: "4px 12px 12px 12px",
              background: "var(--bg)", border: "1px solid var(--border)",
              display: "flex", gap: 6, alignItems: "center",
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--accent)",
                  display: "inline-block",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.6,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Example prompts */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" onClick={() => void send(ex)}
              style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 20,
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--muted)", cursor: "pointer", textAlign: "left",
                whiteSpace: "nowrap",
              }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Aufgabe auf Deutsch eingeben… z.B. 'Leg Mieter Anna Meier an'"
          disabled={loading}
          style={{ flex: 1, fontSize: 14, padding: "11px 14px" }}
          autoComplete="off"
        />
        <button type="submit" disabled={loading || !input.trim()}
          style={{
            width: "auto", padding: "11px 16px",
            display: "inline-flex", alignItems: "center", gap: 6,
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}>
          <Send size={15} />
          Senden
        </button>
      </form>

      {/* Tool log */}
      {toolLog.length > 0 && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          <button type="button" onClick={() => setShowTools(v => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 14px",
              width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
            }}>
            <Wrench size={13} style={{ color: "var(--muted)" }} />
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Ausgeführte Aktionen ({toolLog.length})
            </span>
            {showTools ? <ChevronUp size={13} style={{ color: "var(--muted)", marginLeft: "auto" }} /> : <ChevronDown size={13} style={{ color: "var(--muted)", marginLeft: "auto" }} />}
          </button>

          {showTools && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              {toolLog.map((t, i) => (
                <div key={i} style={{ padding: "10px 14px", borderBottom: i < toolLog.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {t.tool.replace(/_/g, " ")}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{t.result}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

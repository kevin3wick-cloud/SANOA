"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, X } from "lucide-react";

type TeamMember = { id: string; name: string };

export function TicketTransferButton({ teamMembers }: { teamMembers: TeamMember[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function transfer() {
    if (!from || !to || from === to) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/tickets/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: from, toUserId: to }),
      });
      const data = await res.json();
      if (res.ok) {
        const fromName = teamMembers.find(m => m.id === from)?.name ?? "–";
        const toName   = teamMembers.find(m => m.id === to)?.name ?? "–";
        setResult(`${data.transferred} Ticket(s) von ${fromName} an ${toName} übertragen.`);
        setFrom(""); setTo("");
        router.refresh();
      }
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setResult(null); }}
        style={{
          width: "auto", fontSize: 13, padding: "7px 14px",
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "transparent", border: "1px solid var(--border)", color: "var(--text)",
        }}
      >
        <ArrowRightLeft size={14} strokeWidth={1.75} />
        Tickets übergeben
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "16px", width: 320,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Tickets übergeben</p>
            <button type="button" onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--muted)" }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)" }}>
            Alle offenen Tickets einer Person an eine andere übertragen — z.B. bei Krankheit oder Urlaub.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Von</label>
              <select value={from} onChange={e => setFrom(e.target.value)}
                style={{ width: "100%", fontSize: 13, padding: "8px 10px" }}>
                <option value="">Mitarbeiter wählen…</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id} disabled={m.id === to}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>An</label>
              <select value={to} onChange={e => setTo(e.target.value)}
                style={{ width: "100%", fontSize: 13, padding: "8px 10px" }}>
                <option value="">Mitarbeiter wählen…</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id} disabled={m.id === from}>{m.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={transfer}
              disabled={!from || !to || from === to || loading}
              style={{ fontSize: 13, padding: "9px", marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Wird übertragen…" : "Jetzt übergeben"}
            </button>
            {result && (
              <p style={{ margin: 0, fontSize: 13, color: "#34d399" }}>✓ {result}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

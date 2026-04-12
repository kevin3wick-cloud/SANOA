"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";

export function TicketAiAction({ ticketId }: { ticketId: string }) {
  const [action, setAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/ai-action`);
        if (!res.ok) return;
        const data = (await res.json()) as { action?: string | null };
        if (!cancelled && data.action) setAction(data.action);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketId]);

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px", borderRadius: 10,
        background: "var(--surface)", border: "1px solid var(--border)",
        fontSize: 13, color: "var(--muted)",
      }}>
        <Lightbulb size={14} strokeWidth={1.75} />
        KI analysiert…
      </div>
    );
  }

  if (!action) return null;

  return (
    <div style={{
      display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10,
      background: "color-mix(in srgb, #f59e0b 8%, transparent)",
      border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
    }}>
      <Lightbulb
        size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1, color: "#f59e0b" }}
      />
      <div>
        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          KI-Empfehlung
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--text)" }}>
          {action}
        </p>
      </div>
    </div>
  );
}

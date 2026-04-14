"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock } from "lucide-react";

type Props = {
  tenantId: string;
  currentName: string;
  pendingName: string;
  pendingNameReason: string;
  pendingNameRequestedAt: string;
};

export function NameRequestCard({ tenantId, currentName, pendingName, pendingNameReason, pendingNameRequestedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<{ approved: boolean; name?: string } | null>(null);

  async function decide(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/mieter/${tenantId}/name-request`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone({ approved: action === "approve", name: data.newName });
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  const date = new Date(pendingNameRequestedAt).toLocaleDateString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  if (done) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
        background: done.approved ? "rgba(52,211,153,.08)" : "rgba(248,113,113,.08)",
        border: `1px solid ${done.approved ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}`,
        borderRadius: 10, fontSize: 13,
      }}>
        {done.approved
          ? <CheckCircle size={16} style={{ color: "#34d399", flexShrink: 0 }} />
          : <XCircle size={16} style={{ color: "#f87171", flexShrink: 0 }} />}
        <span>
          {done.approved
            ? `Name geändert: «${done.name}»`
            : "Anfrage abgelehnt. Name bleibt unverändert."}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: "color-mix(in srgb, #f59e0b 8%, transparent)",
      border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Clock size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <strong style={{ fontSize: 13 }}>Namensänderung angefragt</strong>
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>{date}</span>
      </div>
      <div style={{ fontSize: 13, marginBottom: 12, display: "grid", gap: 4 }}>
        <div><span style={{ color: "var(--muted)" }}>Aktuell: </span>{currentName}</div>
        <div><span style={{ color: "var(--muted)" }}>Neu: </span><strong>{pendingName}</strong></div>
        <div><span style={{ color: "var(--muted)" }}>Grund: </span>{pendingNameReason}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => void decide("approve")}
          disabled={loading !== null}
          style={{
            flex: 1, fontSize: 13, padding: "8px 12px",
            background: "#34d399", color: "#fff", border: "none",
            borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <CheckCircle size={14} />
          {loading === "approve" ? "Wird bestätigt…" : "Bestätigen"}
        </button>
        <button
          type="button"
          onClick={() => void decide("reject")}
          disabled={loading !== null}
          style={{
            flex: 1, fontSize: 13, padding: "8px 12px",
            background: "transparent", color: "#f87171",
            border: "1px solid rgba(248,113,113,.4)",
            borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <XCircle size={14} />
          {loading === "reject" ? "Wird abgelehnt…" : "Ablehnen"}
        </button>
      </div>
    </div>
  );
}

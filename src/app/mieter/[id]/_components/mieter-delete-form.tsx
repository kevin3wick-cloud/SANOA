"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";

export function MieterDeleteForm({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (typed.trim() !== tenantName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mieter/${tenantId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Löschen.");
        setLoading(false);
        return;
      }
      router.push("/mieter");
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("confirm")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #f87171",
          background: "transparent",
          color: "#f87171",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          width: "auto",
        }}
      >
        <Trash2 size={14} strokeWidth={2} aria-hidden />
        Mieter löschen
      </button>
    );
  }

  return (
    <div
      className="card stack"
      style={{ borderColor: "#f87171", borderWidth: 1, borderStyle: "solid" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AlertTriangle size={20} strokeWidth={1.75} style={{ color: "#f87171", flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>Mieter unwiderruflich löschen</p>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Alle Tickets, Notizen und der Portal-Zugang werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
          Zur Bestätigung den Namen des Mieters eingeben:{" "}
          <strong>{tenantName}</strong>
        </label>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={tenantName}
          disabled={loading}
          autoFocus
          style={{ fontSize: 14 }}
        />
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || typed.trim() !== tenantName.trim()}
          style={{
            flex: 1,
            background: typed.trim() === tenantName.trim() ? "#f87171" : undefined,
            borderColor: "#f87171",
            color: typed.trim() === tenantName.trim() ? "#fff" : "#f87171",
            opacity: typed.trim() !== tenantName.trim() ? 0.5 : 1,
          }}
        >
          <Trash2 size={14} strokeWidth={2} style={{ marginRight: 6 }} aria-hidden />
          {loading ? "Wird gelöscht…" : "Endgültig löschen"}
        </button>
        <button
          type="button"
          onClick={() => { setStep("idle"); setTyped(""); setError(null); }}
          disabled={loading}
          style={{ flex: 1 }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

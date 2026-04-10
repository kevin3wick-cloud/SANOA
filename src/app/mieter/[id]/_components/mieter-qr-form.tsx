"use client";

import { useState } from "react";
import { QrCode, RefreshCw } from "lucide-react";

type Props = {
  tenantId: string;
  initialToken: string | null;
};

export function MieterQrForm({ tenantId, initialToken }: Props) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "https://app.sanoa.tech";

  const magicUrl = token ? `${baseUrl}/api/mieter-app/magic-login/${token}` : null;
  const qrSrc = magicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(magicUrl)}`
    : null;

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/mieter/${tenantId}/magic-token`, {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok || !data.magicToken) {
        setError(data.error ?? "Fehler beim Erstellen des QR-Codes.");
        return;
      }
      setToken(data.magicToken);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <QrCode size={18} strokeWidth={1.75} color="var(--muted)" />
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Der Mieter scannt den QR-Code und ist sofort eingeloggt — kein Passwort nötig.
        </p>
      </div>

      {qrSrc && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: 8,
            border: "1px solid var(--border)",
            display: "inline-block"
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="QR-Code für Mieter-Login"
              width={220}
              height={220}
              style={{ display: "block", borderRadius: 6 }}
            />
          </div>
          <p className="muted" style={{ fontSize: 11, margin: 0 }}>
            Link: <span style={{ wordBreak: "break-all" }}>{magicUrl}</span>
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            width: "auto",
            fontSize: 13,
            padding: "8px 16px"
          }}
        >
          <RefreshCw size={14} strokeWidth={2} />
          {loading ? "Generiere …" : token ? "QR neu generieren" : "QR-Code erstellen"}
        </button>
      </div>

      {token && (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Wenn du einen neuen QR-Code generierst, wird der alte sofort ungültig.
        </p>
      )}

      {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
    </div>
  );
}

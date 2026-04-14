"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.45)",
  marginBottom: 6,
};

export function SanoaLoginForm({
  apiPath,
  onSuccess,
}: {
  apiPath: string;
  onSuccess: (data: Record<string, unknown>) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setError((data.error as string) ?? "Anmeldung fehlgeschlagen.");
        return;
      }
      onSuccess(data);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>E-Mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading}
          style={inputStyle}
          placeholder="name@beispiel.ch"
        />
      </div>
      <div>
        <label style={labelStyle}>Passwort</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={loading}
          style={inputStyle}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p style={{
          margin: 0, fontSize: 13, color: "#f87171",
          padding: "10px 12px", borderRadius: 8,
          background: "rgba(248,113,113,0.1)",
          border: "1px solid rgba(248,113,113,0.2)",
        }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 4,
          padding: "13px 20px",
          background: loading ? "rgba(123,143,245,0.5)" : "#7b8ff5",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.15s, opacity 0.15s",
          width: "100%",
        }}
      >
        {loading ? "Wird angemeldet …" : "Anmelden"}
      </button>
    </form>
  );
}

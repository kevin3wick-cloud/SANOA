"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <input
        type="email"
        placeholder="E-Mail"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />
      <input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />
      <button type="submit" disabled={loading}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <LogIn size={18} strokeWidth={1.75} aria-hidden />
          {loading ? "Wird angemeldet…" : "Einloggen"}
        </span>
      </button>
      {error && (
        <p className="muted" style={{ color: "var(--color-danger, #e53e3e)", margin: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}

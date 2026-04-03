"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export function MieterLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.includes("@") || password.length < 3) {
      setError("Bitte gültige E-Mail und Passwort eingeben.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/mieter-app/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen.");
        setPending(false);
        return;
      }

      router.push("/mieter-app/dashboard");
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setPending(false);
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
        disabled={pending}
      />
      <input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        disabled={pending}
      />
      <button type="submit" disabled={pending}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          <LogIn size={18} strokeWidth={1.75} aria-hidden />
          {pending ? "Wird angemeldet …" : "Anmelden"}
        </span>
      </button>
      {error && <p className="muted">{error}</p>}
    </form>
  );
}

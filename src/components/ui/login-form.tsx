"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.includes("@") || password.length < 3) {
      setError("Bitte gültige E-Mail und Passwort eingeben.");
      return;
    }

    sessionStorage.setItem("mockRole", "landlord");
    sessionStorage.setItem("mockEmail", email);
    router.push("/dashboard");
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <input
        type="email"
        placeholder="E-Mail"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
      />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        MVP-Hinweis: Login ist bewusst nur ein UI-Mock.
      </p>
      <button type="submit">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          <LogIn size={18} strokeWidth={1.75} aria-hidden />
          Einloggen als Vermieter
        </span>
      </button>
      {error && <p className="muted">{error}</p>}
    </form>
  );
}

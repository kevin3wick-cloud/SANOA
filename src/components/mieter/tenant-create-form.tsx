"use client";

import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function TenantCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [apartment, setApartment] = useState("");
  const [password, setPassword] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setPending(true);

    try {
      const response = await fetch("/api/mieter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          apartment: apartment.trim(),
          password,
          ...(leaseStart ? { leaseStart } : {}),
          ...(leaseEnd ? { leaseEnd } : {})
        })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFeedback(data.error ?? "Mieter konnte nicht gespeichert werden.");
        setPending(false);
        return;
      }

      setName("");
      setEmail("");
      setPhone("");
      setApartment("");
      setPassword("");
      setLeaseStart("");
      setLeaseEnd("");
      setFeedback(
        "Mieter wurde erfasst. Zugang Mieter-Portal: dieselbe E-Mail und das gewählte Passwort unter /mieter-app/login."
      );
      router.refresh();
    } catch {
      setFeedback("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Neuen Mieter erfassen</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
        Stammdaten für Tickets und Dokumente. Es wird automatisch ein Zugang zum Mieter-Portal
        angelegt (Login mit E-Mail und Passwort).
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail"
          autoComplete="email"
          required
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefon"
          autoComplete="tel"
          required
        />
        <input
          value={apartment}
          onChange={(e) => setApartment(e.target.value)}
          placeholder="Wohnung / Einheit"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort Mieter-Portal (min. 6 Zeichen)"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <label className="muted" style={{ fontSize: 13 }}>
          Mietbeginn (optional)
        </label>
        <input
          type="date"
          value={leaseStart}
          onChange={(e) => setLeaseStart(e.target.value)}
          disabled={pending}
        />
        <label className="muted" style={{ fontSize: 13 }}>
          Mietende / Auszug (optional)
        </label>
        <input
          type="date"
          value={leaseEnd}
          onChange={(e) => setLeaseEnd(e.target.value)}
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
            <UserPlus size={18} strokeWidth={1.75} aria-hidden />
            {pending ? "Wird gespeichert …" : "Mieter speichern"}
          </span>
        </button>
        {feedback && <p className="muted">{feedback}</p>}
      </form>
    </div>
  );
}

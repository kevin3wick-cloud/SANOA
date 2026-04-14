"use client";

import { FormEvent, useEffect, useState } from "react";
import { UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string };

export function TenantCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [apartment, setApartment] = useState("");
  const [password, setPassword] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/properties")
      .then(r => r.json())
      .then((d: Property[]) => { if (Array.isArray(d)) setProperties(d); })
      .catch(() => {});
  }, []);

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
          leaseStart,
          ...(leaseEnd ? { leaseEnd } : {}),
          ...(propertyId ? { propertyId } : {}),
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
      setPropertyId("");
      setFeedback(
        "Mieter wurde erfasst. Zugang Mieter-Portal: dieselbe E-Mail und das gewählte Passwort unter /mieter-app/login."
      );
      setOpen(false);
      router.refresh();
    } catch {
      setFeedback("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card stack">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setFeedback(""); }}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <UserPlus size={18} strokeWidth={1.75} style={{ color: "var(--accent)" }} aria-hidden />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Neuen Mieter erfassen</span>
        </div>
        {open
          ? <ChevronUp size={16} style={{ color: "var(--muted)" }} />
          : <ChevronDown size={16} style={{ color: "var(--muted)" }} />}
      </button>

      {open && <form className="stack" onSubmit={onSubmit} autoComplete="off">
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
        {properties.length > 0 && (
          <select
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            style={{ fontSize: 13 }}
          >
            <option value="">Liegenschaft zuweisen (optional)</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <label className="muted" style={{ fontSize: 13 }}>
          Mietbeginn <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          type="date"
          value={leaseStart}
          onChange={(e) => setLeaseStart(e.target.value)}
          disabled={pending}
          required
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
      </form>}
    </div>
  );
}

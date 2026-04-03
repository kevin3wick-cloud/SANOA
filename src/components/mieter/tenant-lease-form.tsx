"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tenantId: string;
  leaseStartIso: string | null;
  leaseEndIso: string | null;
  isArchived?: boolean;
};

function toInputDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function TenantLeaseForm({ tenantId, leaseStartIso, leaseEndIso, isArchived }: Props) {
  const router = useRouter();
  const [leaseStart, setLeaseStart] = useState(toInputDate(leaseStartIso));
  const [leaseEnd, setLeaseEnd] = useState(toInputDate(leaseEndIso));
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setPending(true);
    try {
      const res = await fetch(`/api/mieter/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseStart: leaseStart || null,
          leaseEnd: leaseEnd || null
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback(data.error ?? "Speichern fehlgeschlagen.");
        setPending(false);
        return;
      }
      setFeedback("Mietzeiten gespeichert. Bei abgelaufenem Mietende wird der Mieter ins Archiv verschoben.");
      router.refresh();
    } catch {
      setFeedback("Netzwerkfehler.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Mietzeiten</h3>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Optional: Nach dem Enddatum wird der Mieter automatisch ins Archiv verschoben und kann sich nicht
        mehr im Mieter-Portal anmelden.
        {isArchived
          ? " Bei einem neuen Mietende in der Zukunft wird der Zugang wieder freigeschaltet."
          : ""}
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <label className="muted" htmlFor={`lease-start-${tenantId}`} style={{ fontSize: 13 }}>
          Mietbeginn
        </label>
        <input
          id={`lease-start-${tenantId}`}
          type="date"
          value={leaseStart}
          onChange={(e) => setLeaseStart(e.target.value)}
          disabled={pending}
        />
        <label className="muted" htmlFor={`lease-end-${tenantId}`} style={{ fontSize: 13 }}>
          Mietende (Auszug)
        </label>
        <input
          id={`lease-end-${tenantId}`}
          type="date"
          value={leaseEnd}
          onChange={(e) => setLeaseEnd(e.target.value)}
          disabled={pending}
        />
        <button type="submit" disabled={pending}>
          {pending ? "Speichern …" : "Mietzeiten speichern"}
        </button>
        {feedback && <p className="muted">{feedback}</p>}
      </form>
    </div>
  );
}

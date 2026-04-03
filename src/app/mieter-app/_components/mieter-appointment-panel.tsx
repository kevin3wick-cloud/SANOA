"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentProposalStatus } from "@prisma/client";
import { formatDate } from "@/lib/format";

type Props = {
  ticketId: string;
  pendingProposal: {
    id: string;
    message: string;
    createdAt: string;
  } | null;
  history: {
    id: string;
    message: string;
    status: AppointmentProposalStatus;
    createdAt: string;
    respondedAt: string | null;
  }[];
};

const statusLabel: Record<AppointmentProposalStatus, string> = {
  PENDING: "Ausstehend",
  CONFIRMED: "Bestätigt",
  REJECTED: "Abgelehnt",
  WITHDRAWN: "Ersetzt"
};

export function MieterAppointmentPanel({
  ticketId,
  pendingProposal,
  history
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(proposalId: string, decision: "confirm" | "reject") {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/mieter-app/tickets/${ticketId}/appointment-proposals/${proposalId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision })
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Aktion fehlgeschlagen.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack">
      <h3 style={{ margin: 0 }}>Terminvorschlag der Verwaltung</h3>
      {pendingProposal ? (
        <div className="stack">
          <p style={{ margin: 0, fontSize: 14 }}>
            <span className="muted">Vorschlag vom {formatDate(new Date(pendingProposal.createdAt))}:</span>
          </p>
          <p style={{ margin: 0 }}>{pendingProposal.message}</p>
          <div className="inline-action-buttons">
            <button
              type="button"
              className="btn-inline"
              disabled={busy}
              onClick={() => respond(pendingProposal.id, "confirm")}
            >
              Bestätigen
            </button>
            <button
              type="button"
              className="secondary-button btn-inline"
              disabled={busy}
              onClick={() => respond(pendingProposal.id, "reject")}
            >
              Ablehnen
            </button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Aktuell liegt kein offener Terminvorschlag vor.
        </p>
      )}
      {error && <p className="muted">{error}</p>}
      {history.filter((h) => h.status !== "PENDING").length > 0 && (
        <div className="muted" style={{ fontSize: 13 }}>
          <p style={{ margin: "8px 0 4px", fontWeight: 600 }}>Frühere Vorschläge</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {history
              .filter((h) => h.status !== "PENDING")
              .map((h) => (
                <li key={h.id} style={{ marginBottom: 6 }}>
                  {statusLabel[h.status]}: {h.message}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

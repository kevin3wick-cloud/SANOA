"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Ticket, TicketCategory, TicketStatus } from "@prisma/client";
import {
  formatCategory,
  formatDate,
  formatStatus,
  getStatusBadgeClassName
} from "@/lib/format";
import { formatPriorityLabel, getTicketPriority } from "@/lib/ticket-priority";

type TicketRow = Omit<Ticket, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  unreadFromLandlord?: boolean;
};

type MieterTicketsListProps = {
  limit?: number;
  title?: string;
  statusFilter?: TicketStatus[];
  emptyText?: string;
};

export function MieterTicketsList({ limit, title = "Deine Tickets", statusFilter, emptyText }: MieterTicketsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/mieter-app/tickets", {
          credentials: "include"
        });
        const data = (await response.json()) as TicketRow[] | { error?: string };
        if (response.status === 401) {
          if (!cancelled) {
            router.replace("/mieter-app/login");
          }
          return;
        }
        if (!response.ok) {
          if (!cancelled) {
            setError(
              "error" in data && data.error
                ? data.error
                : "Tickets konnten nicht geladen werden."
            );
            setTickets([]);
          }
          return;
        }
        if (!cancelled) {
          setTickets(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Netzwerkfehler.");
          setTickets([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  const filtered = tickets && statusFilter
    ? tickets.filter((t) => statusFilter.includes(t.status as TicketStatus))
    : tickets;
  const shown =
    filtered && limit !== undefined ? filtered.slice(0, limit) : filtered;

  return (
    <div className="card stack">
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
      {error && <p className="muted">{error}</p>}
      {tickets === null && !error && <p className="muted">Lade Tickets …</p>}
      {shown && shown.length === 0 && !error && (
        <p className="muted">{emptyText ?? "Noch keine Tickets."}</p>
      )}
      {shown && shown.length > 0 && (
        <ul className="stack" style={{ listStyle: "none", margin: 0, padding: 0, gap: 12 }}>
          {shown.map((t) => {
            const priority = getTicketPriority(
              t.category as TicketCategory,
              t.status as TicketStatus,
              t.isUrgent
            );
            return (
              <li
                key={t.id}
                className="ticket-note-item"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6
                  }}
                >
                  <Link
                    href={`/mieter-app/tickets/${t.id}`}
                    className="dashboard-ticket-title-link"
                    style={{ display: "inline", flex: 1 }}
                  >
                    {t.title}
                  </Link>
                  {t.unreadFromLandlord ? (
                    <span
                      title="Neue Nachricht der Verwaltung"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 22,
                        height: 22,
                        padding: "0 6px",
                        borderRadius: 999,
                        background: "#f87171",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      1
                    </span>
                  ) : null}
                </div>
                <div className="ticket-badges-row" style={{ marginBottom: 8 }}>
                  <span className={getStatusBadgeClassName(t.status as TicketStatus)}>
                    {formatStatus(t.status as TicketStatus)}
                  </span>
                  <span
                    className={
                      priority === "dringend"
                        ? "priority-badge priority-high"
                        : "priority-badge priority-normal"
                    }
                  >
                    {formatPriorityLabel(priority)}
                  </span>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {formatCategory(t.category as TicketCategory)} ·{" "}
                  {formatDate(new Date(t.createdAt))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

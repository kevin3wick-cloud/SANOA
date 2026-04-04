"use client";

import Link from "next/link";
import { TicketCategory } from "@prisma/client";
import { useMemo, useState } from "react";
import { formatCategory, formatDate, formatStatus, getStatusBadgeClassName } from "@/lib/format";
import type { TicketWithTenantAndUnread } from "@/lib/ticket-board-rows";

type FilterValues = {
  title: string;
  tenantName: string;
  apartment: string;
  category: TicketCategory | "";
  createdFrom: string;
  createdTo: string;
};

function filterTickets(tickets: TicketWithTenantAndUnread[], f: FilterValues) {
  const titleQ = f.title.trim().toLowerCase();
  const tenantQ = f.tenantName.trim().toLowerCase();
  const aptQ = f.apartment.trim().toLowerCase();

  return tickets.filter((t) => {
    if (titleQ && !t.title.toLowerCase().includes(titleQ)) return false;
    if (tenantQ && !t.tenant.name.toLowerCase().includes(tenantQ)) return false;
    if (aptQ && !t.tenant.apartment.toLowerCase().includes(aptQ)) return false;
    if (f.category && t.category !== f.category) return false;
    if (f.createdFrom) {
      const from = new Date(`${f.createdFrom}T00:00:00`);
      if (t.createdAt < from) return false;
    }
    if (f.createdTo) {
      const to = new Date(`${f.createdTo}T23:59:59.999`);
      if (t.createdAt > to) return false;
    }
    return true;
  });
}

function hasAnyFilter(f: FilterValues) {
  return Boolean(
    f.title.trim() ||
      f.tenantName.trim() ||
      f.apartment.trim() ||
      f.category ||
      f.createdFrom ||
      f.createdTo
  );
}

export type TicketsBoardTone = "open" | "progress" | "done";

type TicketsBoardSectionProps = {
  id?: string;
  title: string;
  /** Farbakzent für die Spalten-Überschrift (Offen / In Bearbeitung / Erledigt). */
  tone?: TicketsBoardTone;
  tickets: TicketWithTenantAndUnread[];
};

function sectionToneClass(tone: TicketsBoardTone | undefined) {
  if (!tone) return "";
  return `tickets-board-section--${tone}`;
}

export function TicketsBoardSection({ id, title, tone, tickets }: TicketsBoardSectionProps) {
  const [titleQ, setTitleQ] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [apartment, setApartment] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const filtered = useMemo(
    () =>
      filterTickets(tickets, {
        title: titleQ,
        tenantName,
        apartment,
        category,
        createdFrom,
        createdTo
      }),
    [tickets, titleQ, tenantName, apartment, category, createdFrom, createdTo]
  );

  const filtersActive = hasAnyFilter({
    title: titleQ,
    tenantName,
    apartment,
    category,
    createdFrom,
    createdTo
  });
  const countLabel =
    filtersActive && filtered.length !== tickets.length
      ? `${filtered.length} / ${tickets.length}`
      : String(filtered.length);

  if (tickets.length === 0) {
    return (
      <section
        id={id}
        className={`tickets-board-section card ${sectionToneClass(tone)}`.trim()}
      >
        <div className="tickets-board-head">
          <h2 className="tickets-board-title">{title}</h2>
          <span className="muted tickets-board-count">0</span>
        </div>
        <p className="muted">Keine Tickets.</p>
      </section>
    );
  }

  return (
    <section id={id} className={`tickets-board-section card ${sectionToneClass(tone)}`.trim()}>
      <div className="tickets-board-head">
        <h2 className="tickets-board-title">{title}</h2>
        <span className="muted tickets-board-count">{countLabel}</span>
      </div>

      <div className="table-wrap">
        <table className="table tickets-table-filterable">
          <thead>
            <tr>
              <th>
                <div className="tickets-th-stack">
                  <span>Titel</span>
                  <input
                    type="search"
                    value={titleQ}
                    onChange={(e) => setTitleQ(e.target.value)}
                    placeholder="Suchen…"
                    aria-label="Titel filtern"
                  />
                </div>
              </th>
              <th>
                <div className="tickets-th-stack">
                  <span>Mieter</span>
                  <input
                    type="search"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Suchen…"
                    aria-label="Mieter filtern"
                  />
                </div>
              </th>
              <th>
                <div className="tickets-th-stack">
                  <span>Wohnung</span>
                  <input
                    type="search"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder="Suchen…"
                    aria-label="Wohnung filtern"
                  />
                </div>
              </th>
              <th>
                <div className="tickets-th-stack">
                  <span>Kategorie</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory((e.target.value as TicketCategory | "") || "")}
                    aria-label="Kategorie filtern"
                  >
                    <option value="">Alle</option>
                    {Object.values(TicketCategory).map((c) => (
                      <option value={c} key={c}>
                        {formatCategory(c)}
                      </option>
                    ))}
                  </select>
                </div>
              </th>
              <th>
                <div className="tickets-th-stack tickets-th-stack-static">
                  <span>Chat</span>
                </div>
              </th>
              <th>
                <div className="tickets-th-stack tickets-th-stack-static">
                  <span>Status</span>
                </div>
              </th>
              <th>
                <div className="tickets-th-stack tickets-th-dates">
                  <span>Erstellt</span>
                  <div className="tickets-th-date-inputs">
                    <input
                      type="date"
                      value={createdFrom}
                      onChange={(e) => setCreatedFrom(e.target.value)}
                      aria-label="Erstellt von"
                    />
                    <input
                      type="date"
                      value={createdTo}
                      onChange={(e) => setCreatedTo(e.target.value)}
                      aria-label="Erstellt bis"
                    />
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted tickets-filter-empty-cell">
                  {filtersActive ? "Keine Treffer für diese Filter." : "Keine Tickets."}
                </td>
              </tr>
            ) : (
              filtered.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        className="table-link dashboard-ticket-title-link"
                        href={`/tickets/${ticket.id}`}
                      >
                        {ticket.title}
                      </Link>
                      {ticket.unreadFromTenant ? (
                        <span className="chat-unread-badge" title="Neue Nachricht vom Mieter">
                          Mieter
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td>{ticket.tenant.name}</td>
                  <td>{ticket.tenant.apartment}</td>
                  <td>{formatCategory(ticket.category)}</td>
                  <td>
                    {ticket.unreadFromTenant ? (
                      <span className="chat-unread-dot-wrap" aria-label="Ungelesene Mieter-Nachricht">
                        <span className="chat-unread-dot" />
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={getStatusBadgeClassName(ticket.status)}>
                      {formatStatus(ticket.status)}
                    </span>
                  </td>
                  <td>{formatDate(ticket.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

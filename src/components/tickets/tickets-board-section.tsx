"use client";

import Link from "next/link";
import { TicketCategory } from "@prisma/client";
import { useMemo, useState } from "react";
import { formatCategory, formatDate } from "@/lib/format";
import type { TicketWithTenantAndUnread } from "@/lib/ticket-board-rows";

type TeamMember = { id: string; name: string };

function InlineAssign({ ticketId, assignedToId, teamMembers }: {
  ticketId: string;
  assignedToId: string | null;
  teamMembers: TeamMember[];
}) {
  const [value, setValue] = useState(assignedToId ?? "");
  const [saving, setSaving] = useState(false);

  async function assign(newId: string) {
    setValue(newId);
    setSaving(true);
    try {
      await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: newId || null }),
      });
    } finally {
      setSaving(false);
    }
  }

  const name = teamMembers.find((m) => m.id === value)?.name;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {value && name && (
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--accent)", color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => void assign(e.target.value)}
        disabled={saving}
        style={{
          fontSize: 12,
          padding: "3px 6px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: value ? "var(--text)" : "var(--muted)",
          cursor: "pointer",
          maxWidth: 130,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">— Niemand —</option>
        {teamMembers.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}

type FilterValues = {
  title: string;
  tenantName: string;
  apartment: string;
  category: TicketCategory | "";
  assignedTo: string;
  createdFrom: string;
  createdTo: string;
};

function filterTickets(tickets: TicketWithTenantAndUnread[], f: FilterValues) {
  const titleQ = f.title.trim().toLowerCase();
  const tenantQ = f.tenantName.trim().toLowerCase();
  const aptQ = f.apartment.trim().toLowerCase();
  const assignedQ = f.assignedTo.trim().toLowerCase();

  return tickets.filter((t) => {
    if (titleQ && !t.title.toLowerCase().includes(titleQ)) return false;
    if (tenantQ && !t.tenant.name.toLowerCase().includes(tenantQ)) return false;
    if (aptQ && !t.tenant.apartment.toLowerCase().includes(aptQ)) return false;
    if (f.category && t.category !== f.category) return false;
    if (assignedQ) {
      const name = t.assignedTo?.name.toLowerCase() ?? "";
      if (!name.includes(assignedQ)) return false;
    }
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
      f.assignedTo.trim() ||
      f.createdFrom ||
      f.createdTo
  );
}

export type TicketsBoardTone = "open" | "progress" | "done";

type TicketsBoardSectionProps = {
  id?: string;
  title: string;
  tone?: TicketsBoardTone;
  tickets: TicketWithTenantAndUnread[];
  teamMembers?: TeamMember[];
};

function sectionToneClass(tone: TicketsBoardTone | undefined) {
  if (!tone) return "";
  return `tickets-board-section--${tone}`;
}

export function TicketsBoardSection({ id, title, tone, tickets, teamMembers = [] }: TicketsBoardSectionProps) {
  const [titleQ, setTitleQ] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [apartment, setApartment] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [assignedTo, setAssignedTo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const filtered = useMemo(
    () =>
      filterTickets(tickets, {
        title: titleQ,
        tenantName,
        apartment,
        category,
        assignedTo,
        createdFrom,
        createdTo
      }),
    [tickets, titleQ, tenantName, apartment, category, assignedTo, createdFrom, createdTo]
  );

  const filtersActive = hasAnyFilter({
    title: titleQ,
    tenantName,
    apartment,
    category,
    assignedTo,
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
                <div className="tickets-th-stack">
                  <span>Zuständig</span>
                  <input
                    type="search"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Suchen…"
                    aria-label="Zuständig filtern"
                  />
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
                <td colSpan={6} className="muted tickets-filter-empty-cell">
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
                    {teamMembers.length > 0 ? (
                      <InlineAssign
                        ticketId={ticket.id}
                        assignedToId={ticket.assignedTo?.id ?? null}
                        teamMembers={teamMembers}
                      />
                    ) : ticket.assignedTo ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: "var(--accent)", color: "#fff",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {ticket.assignedTo.name.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ fontSize: 13 }}>{ticket.assignedTo.name}</span>
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: 13 }}>—</span>
                    )}
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

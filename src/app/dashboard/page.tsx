export const dynamic = 'force-dynamic';

import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  LayoutGrid,
} from "lucide-react";
import { TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { formatCategory, formatDate, formatStatus, getStatusBadgeClassName } from "@/lib/format";
import {
  annotateTicketsForLandlordBoard,
  chatNotesInclude
} from "@/lib/ticket-board-rows";
import {
  formatPriorityLabel,
  getTicketPriority,
  type TicketPriorityLevel
} from "@/lib/ticket-priority";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { redirect } from "next/navigation";

function sortActionTickets<
  T extends {
    category: Parameters<typeof getTicketPriority>[0];
    status: TicketStatus;
    isUrgent?: boolean;
    createdAt: Date;
  }
>(tickets: T[]) {
  return [...tickets].sort((a, b) => {
    const pa = getTicketPriority(a.category, a.status, a.isUrgent);
    const pb = getTicketPriority(b.category, b.status, b.isUrgent);
    if (pa === "dringend" && pb !== "dringend") return -1;
    if (pa !== "dringend" && pb === "dringend") return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

function priorityBadgeClass(level: TicketPriorityLevel) {
  return level === "dringend" ? "priority-badge priority-high" : "priority-badge priority-normal";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sessionUser = await getLandlordSessionUser();
  if ((sessionUser?.role as string) === "ADMIN") {
    redirect("/admin");
  }

  const { filter = "" } = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (sessionUser as any)?.orgId ?? null;
  const isOrgAdmin = (sessionUser as any)?.orgRole === "ORG_ADMIN";

  // ORG_ADMIN sees all, others see only their assigned tickets
  const visibilityWhere = isOrgAdmin
    ? { tenant: { orgId } }
    : { assignedToId: sessionUser?.id, tenant: { orgId } };

  // Status filter from URL param
  const statusWhere =
    filter === "open"     ? { status: TicketStatus.OPEN } :
    filter === "progress" ? { status: TicketStatus.IN_PROGRESS } :
    filter === "done"     ? { status: TicketStatus.DONE } :
    { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] as TicketStatus[] } };

  const [open, inProgress, done, actionTicketsRaw] = await Promise.all([
    db.ticket.count({ where: { status: TicketStatus.OPEN, ...visibilityWhere } }),
    db.ticket.count({ where: { status: TicketStatus.IN_PROGRESS, ...visibilityWhere } }),
    db.ticket.count({ where: { status: TicketStatus.DONE, ...visibilityWhere } }),
    db.ticket.findMany({
      where: { ...statusWhere, ...visibilityWhere },
      include: { tenant: true, ...chatNotesInclude },
      orderBy: filter === "done" ? { updatedAt: "desc" } : { createdAt: "desc" },
    })
  ]);

  const total = open + inProgress + done;
  const actionTicketsAnnotated = annotateTicketsForLandlordBoard(actionTicketsRaw);
  const actionTickets = sortActionTickets(actionTicketsAnnotated).slice(0, 8);

  return (
    <AppShell>
      <div className="stack dashboard-stack">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-lead muted">
            {isOrgAdmin ? "Übersicht aller Tickets." : "Deine zugewiesenen Tickets."}
          </p>
        </div>

        <div className="grid grid-4">
          {[
            { key: "open",     label: "Offen",          value: open,       icon: <CircleAlert size={22} strokeWidth={1.75} aria-hidden />, cls: "stat-icon-open" },
            { key: "progress", label: "In Bearbeitung", value: inProgress, icon: <CircleDot   size={22} strokeWidth={1.75} aria-hidden />, cls: "stat-icon-progress" },
            { key: "done",     label: "Erledigt",       value: done,       icon: <CircleCheck size={22} strokeWidth={1.75} aria-hidden />, cls: "stat-icon-done" },
            { key: "",         label: "Gesamt",         value: total,      icon: <LayoutGrid  size={22} strokeWidth={1.75} aria-hidden />, cls: "stat-icon-total" },
          ].map(({ key, label, value, icon, cls }) => {
            const active = filter === key;
            return (
              <Link
                key={label}
                href={active ? "/dashboard" : `/dashboard${key ? `?filter=${key}` : ""}`}
                className={`card stat-card stat-card-link${active ? " stat-card-active" : ""}`}
                style={active ? {
                  borderColor: "var(--accent)",
                  background: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
                } : undefined}
              >
                <div className="stat-card-inner">
                  <div className={`stat-icon-wrap ${cls}`}>{icon}</div>
                  <div>
                    <div className="muted" style={{ fontSize: 13 }}>{label}</div>
                    <p className="stat-value">{value}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="card dashboard-queue-card">
          <div className="dashboard-queue-head">
            <div>
              <h3 className="dashboard-queue-title">
                {filter === "open"     ? "Offene Tickets" :
                 filter === "progress" ? "Tickets in Bearbeitung" :
                 filter === "done"     ? "Erledigte Tickets" :
                 "Bearbeitungsliste"}
              </h3>
              <p className="muted dashboard-queue-sub">
                {filter === "done"
                  ? "Abgeschlossene Tickets."
                  : filter
                    ? "Gefilterte Ansicht — Karte nochmals klicken zum Zurücksetzen."
                    : "Offen und in Bearbeitung, sortiert nach Dringlichkeit und Alter."}
              </p>
            </div>
          </div>
          {actionTickets.length === 0 ? (
            <p className="muted">Keine offenen oder laufenden Tickets. Gut gemacht.</p>
          ) : (
            <div className="table-wrap">
              <table className="table dashboard-queue-table">
                <thead>
                  <tr>
                    <th>Titel</th>
                    <th>Mieter</th>
                    <th>Einheit</th>
                    <th>Kategorie</th>
                    <th>Chat</th>
                    <th>Priorität</th>
                    <th>Status</th>
                    <th>Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {actionTickets.map((ticket) => {
                    const priority = getTicketPriority(
                      ticket.category,
                      ticket.status,
                      ticket.isUrgent
                    );
                    const urgent = priority === "dringend";
                    return (
                      <tr
                        key={ticket.id}
                        className={urgent ? "dashboard-row-urgent" : undefined}
                        style={{ position: "relative" }}
                      >
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap"
                            }}
                          >
                            <Link
                              className="dashboard-ticket-title-link"
                              href={`/tickets/${ticket.id}`}
                              style={{ position: "static" }}
                            >
                              {/* Invisible overlay makes entire row clickable */}
                              <span style={{
                                position: "absolute", inset: 0, zIndex: 0,
                              }} aria-hidden />
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
                        <td className="muted">{ticket.tenant.apartment}</td>
                        <td>{formatCategory(ticket.category)}</td>
                        <td>
                          {ticket.unreadFromTenant ? (
                            <span className="chat-unread-dot-wrap" aria-hidden>
                              <span className="chat-unread-dot" />
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={priorityBadgeClass(priority)}>
                            {formatPriorityLabel(priority)}
                          </span>
                        </td>
                        <td>
                          <span className={getStatusBadgeClassName(ticket.status)}>
                            {formatStatus(ticket.status)}
                          </span>
                        </td>
                        <td className="muted">{formatDate(ticket.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

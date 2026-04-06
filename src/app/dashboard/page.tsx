export const dynamic = 'force-dynamic';

import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  LayoutGrid,
  ListTodo,
  Sparkles
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

const MS_TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

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

export default async function DashboardPage() {
  const sessionUser = await getLandlordSessionUser();
  if ((sessionUser?.role as string) === "ADMIN") {
    redirect("/admin");
  }

  const twoDaysAgo = new Date(Date.now() - MS_TWO_DAYS);

  const [
    open,
    inProgress,
    done,
    staleOpenCount,
    actionTicketsRaw,
    newestOpen,
    newestInProgress
  ] = await Promise.all([
    db.ticket.count({ where: { status: TicketStatus.OPEN } }),
    db.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
    db.ticket.count({ where: { status: TicketStatus.DONE } }),
    db.ticket.count({
      where: {
        status: TicketStatus.OPEN,
        createdAt: { lt: twoDaysAgo }
      }
    }),
    db.ticket.findMany({
      where: {
        status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
      },
      include: { tenant: true, ...chatNotesInclude }
    }),
    db.ticket.findFirst({
      where: { status: TicketStatus.OPEN },
      orderBy: { createdAt: "desc" }
    }),
    db.ticket.findFirst({
      where: { status: TicketStatus.IN_PROGRESS },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const total = open + inProgress + done;
  const actionTicketsAnnotated = annotateTicketsForLandlordBoard(actionTicketsRaw);
  const unreadTenantChatCount = actionTicketsAnnotated.filter((t) => t.unreadFromTenant)
    .length;
  const actionTickets = sortActionTickets(actionTicketsAnnotated).slice(0, 8);
  const nextTicketHref = newestOpen
    ? `/tickets/${newestOpen.id}`
    : newestInProgress
      ? `/tickets/${newestInProgress.id}`
      : "/tickets";

  const hints: { id: string; text: string; variant: "info" | "warning" }[] = [];

  if (open > 0) {
    hints.push({
      id: "open",
      text:
        open === 1
          ? "1 Ticket wartet auf Bearbeitung."
          : `${open} Tickets warten auf Bearbeitung.`,
      variant: "info"
    });
  }

  if (inProgress > 0) {
    hints.push({
      id: "progress",
      text:
        inProgress === 1
          ? "1 Ticket ist in Bearbeitung."
          : `${inProgress} Tickets sind in Bearbeitung.`,
      variant: "info"
    });
  }

  if (staleOpenCount > 0) {
    hints.push({
      id: "stale",
      text:
        staleOpenCount === 1
          ? "1 Ticket ist seit mehr als 2 Tagen offen."
          : `${staleOpenCount} Tickets sind seit mehr als 2 Tagen offen.`,
      variant: "warning"
    });
  }

  if (unreadTenantChatCount > 0) {
    hints.push({
      id: "tenant-chat",
      text:
        unreadTenantChatCount === 1
          ? "1 Ticket mit neuer Mieter-Nachricht im Chat."
          : `${unreadTenantChatCount} Tickets mit neuen Mieter-Nachrichten im Chat.`,
      variant: "info"
    });
  }

  if (hints.length === 0 && total === 0) {
    hints.push({
      id: "empty",
      text: "Noch keine Tickets. Sobald Mieter melden, erscheinen sie hier.",
      variant: "info"
    });
  }

  return (
    <AppShell>
      <div className="stack dashboard-stack">
        <div className="dashboard-hero">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-lead muted">
              Prioritäten erkennen und nächste Schritte sofort sehen.
            </p>
          </div>
          <div className="dashboard-quick-actions">
            <Link href={nextTicketHref} className="dashboard-cta dashboard-cta-primary">
              <Sparkles size={18} strokeWidth={1.75} aria-hidden />
              Neues Ticket ansehen
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
            </Link>
            <Link href="/tickets#tickets-offen" className="dashboard-cta dashboard-cta-secondary">
              <ListTodo size={18} strokeWidth={1.75} aria-hidden />
              Alle offenen Tickets
            </Link>
          </div>
        </div>

        {hints.length > 0 && (
          <div className="card dashboard-hints-card">
            <h2 className="dashboard-hints-title">Als Nächstes</h2>
            <ul className="dashboard-hints-list">
              {hints.map((hint) => (
                <li
                  key={hint.id}
                  className={
                    hint.variant === "warning"
                      ? "dashboard-hint dashboard-hint-warning"
                      : "dashboard-hint dashboard-hint-info"
                  }
                >
                  {hint.variant === "warning" ? (
                    <CircleAlert size={20} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <CircleDot size={20} strokeWidth={1.75} aria-hidden />
                  )}
                  <span>{hint.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-4">
          <div className="card stat-card">
            <div className="stat-card-inner">
              <div className="stat-icon-wrap stat-icon-open">
                <CircleAlert size={22} strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <div className="muted">Offene Tickets</div>
                <p className="stat-value">{open}</p>
              </div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-card-inner">
              <div className="stat-icon-wrap stat-icon-progress">
                <CircleDot size={22} strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <div className="muted">In Bearbeitung</div>
                <p className="stat-value">{inProgress}</p>
              </div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-card-inner">
              <div className="stat-icon-wrap stat-icon-done">
                <CircleCheck size={22} strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <div className="muted">Erledigt</div>
                <p className="stat-value">{done}</p>
              </div>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-card-inner">
              <div className="stat-icon-wrap stat-icon-total">
                <LayoutGrid size={22} strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <div className="muted">Gesamt</div>
                <p className="stat-value">{total}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card dashboard-queue-card">
          <div className="dashboard-queue-head">
            <div>
              <h3 className="dashboard-queue-title">Bearbeitungsliste</h3>
              <p className="muted dashboard-queue-sub">
                Offen und in Bearbeitung, sortiert nach Dringlichkeit und Alter.
              </p>
            </div>
            <Link href="/tickets" className="dashboard-text-link">
              Alle Tickets
              <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
            </Link>
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

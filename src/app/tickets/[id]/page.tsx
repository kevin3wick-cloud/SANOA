export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { TicketCategory, TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketActions } from "@/components/tickets/ticket-actions";
import { TicketAppointmentLandlord } from "@/components/tickets/ticket-appointment-landlord";
import { TicketAssign } from "@/components/tickets/ticket-assign";
import { TicketTenantChat } from "@/components/tickets/ticket-tenant-chat";
import { db } from "@/lib/db";
import { formatCategory, formatDate, formatStatus } from "@/lib/format";
import { getLandlordSessionUser } from "@/lib/landlord-auth";

type TicketDetailProps = {
  params: Promise<{ id: string }>;
};

function getStatusBadgeClass(status: TicketStatus) {
  if (status === "OPEN") return "status-badge status-open";
  if (status === "IN_PROGRESS") return "status-badge status-progress";
  return "status-badge status-done";
}

function getPriority(ticket: { category: TicketCategory; status: TicketStatus }) {
  if (ticket.category === "HEIZUNG" && ticket.status !== "DONE") {
    return { label: "Dringend", className: "priority-badge priority-high" };
  }
  return { label: "Normal", className: "priority-badge priority-normal" };
}

export default async function TicketDetailPage({ params }: TicketDetailProps) {
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      tenant: true,
      assignedTo: { select: { id: true, name: true } },
      notes: { orderBy: { createdAt: "asc" } },
      appointmentProposals: { orderBy: { createdAt: "desc" } },
    },
  });

  const currentUser = await getLandlordSessionUser();
  const teamMembers = await db.user.findMany({
    where: { role: "LANDLORD", orgId: currentUser?.orgId ?? "__none__" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (!ticket) {
    notFound();
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      landlordLastSeenChatAt: new Date(),
      landlordLastSeenAppointmentsAt: new Date()
    }
  });

  const priority = getPriority(ticket);
  const historyItems = [
    {
      id: "created",
      text: `Ticket erstellt am ${formatDate(ticket.createdAt)}`
    },
    {
      id: "status-mock",
      text: `Status aktuell: ${formatStatus(ticket.status)}`
    }
  ];

  const chatNotes = ticket.notes.map((note) => ({
    id: note.id,
    text: note.text,
    isInternal: note.isInternal,
    isTenantAuthor: note.isTenantAuthor,
    createdAt: note.createdAt.toISOString()
  }));

  return (
    <AppShell>
      <div className="grid ticket-detail-layout">
        <div className="stack">
          <div className="card ticket-header-card">
            <h1 className="ticket-title">{ticket.title}</h1>
            <p className="muted">
              Ticket #{ticket.id.slice(-6).toUpperCase()} - erstellt am{" "}
              {formatDate(ticket.createdAt)}
            </p>
            <div className="ticket-badges-row">
              <span className={getStatusBadgeClass(ticket.status)}>
                {formatStatus(ticket.status)}
              </span>
              <span className={priority.className}>{priority.label}</span>
            </div>
          </div>

          <div className="grid ticket-info-grid">
            <div className="card stack">
              <h3>Mieter</h3>
              <p>
                <strong>Name:</strong> {ticket.tenant.name}
              </p>
              <p>
                <strong>Kontakt:</strong> {ticket.tenant.email} / {ticket.tenant.phone}
              </p>
            </div>
            <div className="card stack">
              <h3>Objekt / Wohnung</h3>
              <p>
                <strong>Einheit:</strong> {ticket.tenant.apartment}
              </p>
              <p>
                <strong>Ort des Problems:</strong> {ticket.location}
              </p>
            </div>
            <div className="card stack">
              <h3>Problem</h3>
              <p>
                <strong>Kategorie:</strong> {formatCategory(ticket.category)}
              </p>
              <p>
                <strong>Beschreibung:</strong> {ticket.description}
              </p>
            </div>
            <div className="card stack">
              <h3>Zeitliche Angaben</h3>
              <p>
                <strong>Erstellt:</strong> {formatDate(ticket.createdAt)}
              </p>
              <p>
                <strong>Zuletzt aktualisiert:</strong> {formatDate(ticket.updatedAt)}
              </p>
            </div>
          </div>

          <div className="card stack">
            <h3>Hochgeladenes Bild</h3>
            {ticket.imageUrl ? (
              <a href={ticket.imageUrl} target="_blank" rel="noreferrer">
                <img
                  src={ticket.imageUrl}
                  alt={`Ticketbild: ${ticket.title}`}
                  className="ticket-image-preview"
                />
              </a>
            ) : (
              <div className="ticket-image-placeholder">Kein Bild vorhanden</div>
            )}
          </div>

          <TicketTenantChat
            ticketId={ticket.id}
            tenantName={ticket.tenant.name}
            ticketCreatedAt={ticket.createdAt.toISOString()}
            ticketDescription={ticket.description}
            notes={chatNotes}
          />

          <TicketAppointmentLandlord
            ticketId={ticket.id}
            proposals={ticket.appointmentProposals.map((p) => ({
              id: p.id,
              message: p.message,
              status: p.status,
              createdAt: p.createdAt.toISOString(),
              respondedAt: p.respondedAt?.toISOString() ?? null
            }))}
          />

          <div className="card">
            <h3>Verlauf</h3>
            <ul className="ticket-history-list">
              {historyItems.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="stack">
          <TicketActions ticketId={ticket.id} currentStatus={ticket.status} />
          <TicketAssign
            ticketId={ticket.id}
            assignedToId={ticket.assignedTo?.id ?? null}
            assignedToName={ticket.assignedTo?.name ?? null}
            teamMembers={teamMembers}
          />
        </div>
      </div>
    </AppShell>
  );
}

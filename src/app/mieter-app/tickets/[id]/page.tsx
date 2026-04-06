export const dynamic = 'force-dynamic';

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMieterSession } from "@/lib/tenant-auth";
import { db } from "@/lib/db";
import { formatCategory, formatDate, formatStatus, getStatusBadgeClassName } from "@/lib/format";
import { formatPriorityLabel, getTicketPriority } from "@/lib/ticket-priority";
import { MieterNav } from "../../_components/mieter-nav";
import { MieterAppointmentPanel } from "../../_components/mieter-appointment-panel";
import { MieterTicketChat } from "../../_components/mieter-ticket-chat";
import { MieterTopBar } from "../../_components/mieter-top-bar";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MieterTicketDetailPage({ params }: PageProps) {
  const user = await requireMieterSession();
  const { id } = await params;
  const tenantId = user.tenantId;
  if (!tenantId) {
    notFound();
  }

  const ticket = await db.ticket.findFirst({
    where: { id, tenantId },
    include: {
      notes: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" }
      },
      appointmentProposals: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!ticket) {
    notFound();
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      tenantLastSeenChatAt: new Date(),
      tenantLastSeenAppointmentsAt: new Date()
    }
  });

  const priority = getTicketPriority(
    ticket.category,
    ticket.status,
    ticket.isUrgent
  );

  const chatNotes = ticket.notes.map((note) => ({
    id: note.id,
    text: note.text,
    isTenantAuthor: note.isTenantAuthor,
    createdAt: note.createdAt.toISOString()
  }));

  const pendingProposalRow = ticket.appointmentProposals.find((p) => p.status === "PENDING");

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="content" style={{ maxWidth: 640, paddingBottom: 40 }}>
        <div className="stack dashboard-stack">
          <MieterTopBar />
          <MieterNav />
          <p style={{ margin: 0 }}>
            <Link href="/mieter-app/tickets" className="table-link" style={{ fontSize: 14 }}>
              ← Zurück zu den Tickets
            </Link>
          </p>
          <div className="card ticket-header-card stack">
            <h1 className="ticket-title" style={{ fontSize: 22 }}>
              {ticket.title}
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Erstellt am {formatDate(ticket.createdAt)}
            </p>
            <div className="ticket-badges-row">
              <span className={getStatusBadgeClassName(ticket.status)}>
                {formatStatus(ticket.status)}
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
          </div>

          <div className="card stack">
            <h3 style={{ margin: 0 }}>Details</h3>
            <p style={{ margin: 0 }}>
              <span className="muted">Kategorie:</span> {formatCategory(ticket.category)}
            </p>
            <p style={{ margin: 0 }}>
              <span className="muted">Ort:</span> {ticket.location}
            </p>
            {ticket.description && ticket.description !== "—" ? (
              <p style={{ margin: 0 }}>
                <span className="muted">Beschreibung:</span> {ticket.description}
              </p>
            ) : null}
          </div>

          <div className="card stack">
            <h3 style={{ margin: 0 }}>Foto</h3>
            {ticket.imageUrl ? (
              <a href={ticket.imageUrl} target="_blank" rel="noreferrer">
                <img
                  src={ticket.imageUrl}
                  alt=""
                  className="ticket-image-preview"
                />
              </a>
            ) : (
              <div className="ticket-image-placeholder">Kein Bild</div>
            )}
          </div>

          <MieterTicketChat
            ticketId={ticket.id}
            tenantName={user.tenant.name}
            ticketCreatedAt={ticket.createdAt.toISOString()}
            ticketDescription={ticket.description}
            notes={chatNotes}
          />

          <MieterAppointmentPanel
            ticketId={ticket.id}
            ticketTitle={ticket.title}
            pendingProposal={
              pendingProposalRow
                ? {
                    id: pendingProposalRow.id,
                    message: pendingProposalRow.message,
                    createdAt: pendingProposalRow.createdAt.toISOString()
                  }
                : null
            }
            history={ticket.appointmentProposals.map((p) => ({
              id: p.id,
              message: p.message,
              status: p.status,
              createdAt: p.createdAt.toISOString(),
              respondedAt: p.respondedAt?.toISOString() ?? null
            }))}
          />
        </div>
      </div>
    </main>
  );
}

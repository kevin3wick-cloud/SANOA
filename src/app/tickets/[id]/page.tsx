export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { TicketCategory, TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketActions } from "@/components/tickets/ticket-actions";
import { TicketAppointmentLandlord } from "@/components/tickets/ticket-appointment-landlord";
import { TicketAssign } from "@/components/tickets/ticket-assign";
import { TicketTenantChat } from "@/components/tickets/ticket-tenant-chat";
import { TicketAiAction } from "@/components/tickets/ticket-ai-action";
import { db } from "@/lib/db";
import { formatCategory, formatDate, formatStatus } from "@/lib/format";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { Mail, MapPin, User } from "lucide-react";

type TicketDetailProps = {
  params: Promise<{ id: string }>;
};

function getStatusBadgeClass(status: TicketStatus) {
  if (status === "OPEN") return "status-badge status-open";
  if (status === "IN_PROGRESS") return "status-badge status-progress";
  return "status-badge status-done";
}

function getPriority(ticket: { category: TicketCategory; status: TicketStatus; isUrgent: boolean }) {
  if (ticket.isUrgent && ticket.status !== "DONE") {
    return { label: "Dringend", className: "priority-badge priority-high" };
  }
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
  const aiSummary = (ticket as { aiSummary?: string | null }).aiSummary;

  const historyItems = [
    { id: "created", text: `Ticket erstellt am ${formatDate(ticket.createdAt)}` },
    { id: "status-mock", text: `Status aktuell: ${formatStatus(ticket.status)}` }
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

          {/* ── Header ── */}
          <div className="card ticket-header-card">
            <h1 className="ticket-title">{ticket.title}</h1>
            <div className="ticket-badges-row">
              <span className={getStatusBadgeClass(ticket.status)}>
                {formatStatus(ticket.status)}
              </span>
              <span className={priority.className}>{priority.label}</span>
              <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>
                #{ticket.id.slice(-6).toUpperCase()}
              </span>
            </div>
          </div>

          {/* ── Kompakte Info-Leiste ── */}
          <div className="card" style={{ padding: "12px 16px" }}>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "8px 20px", fontSize: 13
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <User size={13} strokeWidth={1.75} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <strong>{ticket.tenant.name}</strong>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Mail size={13} strokeWidth={1.75} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <span className="muted">{ticket.tenant.email}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <MapPin size={13} strokeWidth={1.75} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <span className="muted">{ticket.tenant.apartment}</span>
              </span>
              <span className="muted" style={{ fontSize: 12, marginLeft: "auto", alignSelf: "center" }}>
                {formatDate(ticket.createdAt)}
              </span>
            </div>
          </div>

          {/* ── Bild + Problem nebeneinander ── */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 0,
            }}>
              {/* Bild */}
              <div style={{
                borderRight: "1px solid var(--border)",
                background: "var(--surface)",
                minHeight: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {ticket.imageUrl ? (
                  <a href={`/api/tickets/${ticket.id}/image`} target="_blank" rel="noreferrer"
                    style={{ display: "block", width: "100%" }}>
                    <img
                      src={`/api/tickets/${ticket.id}/image`}
                      alt={`Ticketbild: ${ticket.title}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        maxHeight: 320,
                      }}
                    />
                  </a>
                ) : (
                  <div className="ticket-image-placeholder" style={{ margin: 16 }}>
                    Kein Bild
                  </div>
                )}
              </div>

              {/* Problem-Details */}
              <div className="stack" style={{ padding: "16px 18px", gap: 10 }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Kategorie
                  </p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                    {formatCategory(ticket.category)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Ort
                  </p>
                  <p style={{ margin: 0, fontSize: 14 }}>{ticket.location}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Beschreibung
                  </p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                    {ticket.description}
                  </p>
                </div>

                {/* AI Foto-Analyse */}
                {aiSummary && (
                  <div style={{
                    display: "flex", gap: 8, padding: "9px 11px", borderRadius: 8,
                    background: "var(--accent-dim)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>✨</span>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--accent)", lineHeight: 1.5 }}>
                      {aiSummary}
                    </p>
                  </div>
                )}

                {/* AI Aktionsempfehlung */}
                <TicketAiAction ticketId={ticket.id} />
              </div>
            </div>
          </div>

          {/* ── Chat ── */}
          <TicketTenantChat
            ticketId={ticket.id}
            tenantName={ticket.tenant.name}
            ticketCreatedAt={ticket.createdAt.toISOString()}
            ticketDescription={ticket.description}
            notes={chatNotes}
          />

          {/* ── Terminvorschläge ── */}
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

          {/* ── Verlauf ── */}
          <div className="card">
            <h3>Verlauf</h3>
            <ul className="ticket-history-list">
              {historyItems.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Sidebar ── */}
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

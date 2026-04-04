export const dynamic = 'force-dynamic';

import Link from "next/link";
import { CircleDot } from "lucide-react";
import { hasUnreadFromLandlordForTenant } from "@/lib/ticket-chat-read";
import { requireMieterSession } from "@/lib/tenant-auth";
import { db } from "@/lib/db";
import { MieterDocumentsPanel } from "../_components/mieter-documents-panel";
import { MieterNav } from "../_components/mieter-nav";
import { MieterTicketsList } from "../_components/mieter-tickets-list";
import { MieterTopBar } from "../_components/mieter-top-bar";

export default async function MieterDashboardPage() {
  const user = await requireMieterSession();
  const firstName = user.tenant.name.split(/\s+/)[0] ?? user.tenant.name;
  const tenantId = user.tenantId;

  let landlordUnreadTicketCount = 0;
  if (tenantId) {
    const rows = await db.ticket.findMany({
      where: { tenantId },
      include: {
        notes: {
          where: { isInternal: false },
          select: { createdAt: true, isTenantAuthor: true }
        },
        appointmentProposals: {
          select: { status: true, createdAt: true, respondedAt: true }
        }
      }
    });
    landlordUnreadTicketCount = rows.filter((row) =>
      hasUnreadFromLandlordForTenant(
        {
          createdAt: row.createdAt,
          tenantLastSeenChatAt: row.tenantLastSeenChatAt,
          tenantLastSeenAppointmentsAt: row.tenantLastSeenAppointmentsAt,
          notes: row.notes.map((n) => ({
            createdAt: n.createdAt,
            isInternal: false as const,
            isTenantAuthor: n.isTenantAuthor
          }))
        },
        row.appointmentProposals
      )
    ).length;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="content" style={{ maxWidth: 640, paddingBottom: 40 }}>
        <div className="stack dashboard-stack">
          <MieterTopBar />
          <MieterNav />
          <div>
            <h1 className="page-title">Hallo, {firstName}</h1>
            <p className="page-lead muted">
              {user.tenant.apartment}
            </p>
          </div>
          {landlordUnreadTicketCount > 0 ? (
            <div className="dashboard-hint dashboard-hint-info">
              <CircleDot size={20} strokeWidth={1.75} aria-hidden />
              <span>
                Sie haben{" "}
                <strong>
                  {landlordUnreadTicketCount === 1
                    ? "eine neue Nachricht"
                    : `${landlordUnreadTicketCount} neue Nachrichten`}
                </strong>{" "}
                von der Verwaltung in Ihren Tickets.{" "}
                <Link href="/mieter-app/tickets" className="table-link">
                  Zu den Tickets
                </Link>
              </span>
            </div>
          ) : null}
          <MieterDocumentsPanel />
          <MieterTicketsList limit={5} title="Letzte Tickets" />
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            <Link href="/mieter-app/tickets" className="table-link">
              Alle Tickets anzeigen
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

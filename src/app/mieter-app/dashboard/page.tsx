export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Bell, FileText, TicketIcon } from "lucide-react";
import { hasUnreadFromLandlordForTenant } from "@/lib/ticket-chat-read";
import { requireMieterSession } from "@/lib/tenant-auth";
import { db } from "@/lib/db";
import { MieterDocumentsPanel } from "../_components/mieter-documents-panel";
import { MieterNav } from "../_components/mieter-nav";
import { MieterTicketsList } from "../_components/mieter-tickets-list";
import { MieterTopBar } from "../_components/mieter-top-bar";
import { PushPermissionBanner } from "../_components/push-permission-banner";

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
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Top bar with bell */}
        <MieterTopBar unreadCount={landlordUnreadTicketCount} />

        {/* Greeting */}
        <div style={{ padding: "24px 0 20px" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Hallo, {firstName}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted)" }}>
            {user.tenant.apartment}
          </p>
        </div>

        {/* Nav */}
        <MieterNav />

        {/* Unread message hint */}
        {landlordUnreadTicketCount > 0 && (
          <Link href="/mieter-app/tickets" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 12, margin: "16px 0",
              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--accent)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <TicketIcon size={15} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {landlordUnreadTicketCount === 1
                    ? "1 neue Nachricht"
                    : `${landlordUnreadTicketCount} neue Nachrichten`} von der Verwaltung
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Tippen um zu öffnen</p>
              </div>
              <span style={{ fontSize: 18, color: "var(--muted)" }}>›</span>
            </div>
          </Link>
        )}

        {/* Push banner */}
        <div style={{ margin: "16px 0" }}>
          <PushPermissionBanner />
        </div>

        {/* Documents */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <FileText size={16} strokeWidth={1.75} style={{ color: "var(--muted)" }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Dokumente</h2>
          </div>
          <MieterDocumentsPanel compact />
        </section>

        {/* Tickets */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <TicketIcon size={16} strokeWidth={1.75} style={{ color: "var(--muted)" }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Letzte Tickets</h2>
            <Link href="/mieter-app/tickets" style={{
              marginLeft: "auto", fontSize: 13, color: "var(--accent)", textDecoration: "none"
            }}>
              Alle →
            </Link>
          </div>
          <MieterTicketsList limit={3} />
        </section>

      </div>
    </main>
  );
}

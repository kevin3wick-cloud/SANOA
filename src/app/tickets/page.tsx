export const dynamic = 'force-dynamic';

import Link from "next/link";
import { TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketsBoardSection } from "@/components/tickets/tickets-board-section";
import { TicketTransferButton } from "@/components/tickets/ticket-transfer-button";
import { db } from "@/lib/db";
import {
  annotateTicketsForLandlordBoard,
  chatNotesInclude
} from "@/lib/ticket-board-rows";
import { archiveTenantsPastLeaseEnd } from "@/lib/tenant-lease";
import { getLandlordSessionUser } from "@/lib/landlord-auth";

const boardInclude = {
  tenant: true,
  ...chatNotesInclude
} as const;

type FilterMode = "open" | "progress" | "all" | "assigned" | "done" | "";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await archiveTenantsPastLeaseEnd();
  const user = await getLandlordSessionUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (user as any)?.orgId ?? null;
  const orgWhere = { tenant: { orgId } };

  const params = await searchParams;
  const filter = (params.filter ?? "") as FilterMode | "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isOrgAdmin = (user as any)?.orgRole === "ORG_ADMIN";

  // Non-admins only see their own assigned tickets
  // Admins see all org tickets
  const visibilityFilter = isOrgAdmin
    ? (orgWhere as any)
    : { assignedToId: user?.id, tenant: { orgId } };

  const showOpen     = filter === "open"     || filter === "" || filter === "all";
  const showProgress = filter === "progress" || filter === "" || filter === "all";
  const showDone     = filter === "done"     || filter === "all";

  const teamMembers = await db.user.findMany({
    where: { role: "LANDLORD", orgId: orgId ?? "__none__" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const [openRaw, progressRaw, doneRaw] = await Promise.all([
    showOpen
      ? db.ticket.findMany({
          where: { status: TicketStatus.OPEN, ...visibilityFilter },
          include: boardInclude,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    showProgress
      ? db.ticket.findMany({
          where: { status: TicketStatus.IN_PROGRESS, ...visibilityFilter },
          include: boardInclude,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    showDone
      ? db.ticket.findMany({
          where: { status: TicketStatus.DONE, ...visibilityFilter },
          include: boardInclude,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const openTickets     = annotateTicketsForLandlordBoard(openRaw);
  const progressTickets = annotateTicketsForLandlordBoard(progressRaw);
  const doneTickets     = annotateTicketsForLandlordBoard(doneRaw);

  const filterLabel =
    filter === "open"     ? "Offene Tickets"         :
    filter === "progress" ? "Tickets in Bearbeitung" :
    filter === "done"     ? "Abgeschlossene Tickets" :
    filter === "all"      ? "Alle Tickets"            :
                            isOrgAdmin ? "Alle aktiven Tickets" : "Meine Tickets";

  const filterTabs: { label: string; href: string; active: boolean }[] = [
    { label: "Aktiv",          href: "/tickets",                      active: filter === "" },
    { label: "Offen",          href: "/tickets?filter=open",          active: filter === "open" },
    { label: "In Bearbeitung", href: "/tickets?filter=progress",      active: filter === "progress" },
    { label: "Abgeschlossen",  href: "/tickets?filter=done",          active: filter === "done" },
    ...(isOrgAdmin ? [{ label: "Alle", href: "/tickets?filter=all", active: filter === "all" }] : []),
  ];

  return (
    <AppShell>
      <div className="stack tickets-page">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title">{filterLabel}</h1>
            {!isOrgAdmin && (
              <p className="page-lead muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                Nur Tickets die dir zugewiesen sind. Admins sehen alle.
              </p>
            )}
            <nav style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {filterTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: tab.active ? 600 : 400,
                    background: tab.active ? "var(--accent)" : "transparent",
                    color: tab.active ? "#fff" : "var(--muted)",
                    border: "1px solid",
                    borderColor: tab.active ? "var(--accent)" : "var(--border)",
                    textDecoration: "none",
                  }}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>
          {/* Ticket transfer — only for admins */}
          {isOrgAdmin && <TicketTransferButton teamMembers={teamMembers} />}
        </div>

        {showOpen && (
          <TicketsBoardSection
            id="tickets-offen"
            title="Offen"
            tone="open"
            tickets={openTickets}
            teamMembers={teamMembers}
          />
        )}
        {showProgress && (
          <TicketsBoardSection
            title="In Bearbeitung"
            tone="progress"
            tickets={progressTickets}
            teamMembers={teamMembers}
          />
        )}
        {showDone && (
          <TicketsBoardSection
            title="Erledigt"
            tone="done"
            tickets={doneTickets}
            teamMembers={teamMembers}
          />
        )}
      </div>
    </AppShell>
  );
}

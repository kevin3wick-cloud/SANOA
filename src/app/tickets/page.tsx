export const dynamic = 'force-dynamic';

import Link from "next/link";
import { TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketsBoardSection } from "@/components/tickets/tickets-board-section";
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

  const showOpen     = filter === "open"     || filter === "" || filter === "all";
  const showProgress = filter === "progress" || filter === "" || filter === "all";
  const showDone     = filter === "done"     || filter === "all";
  const showAssigned = filter === "assigned";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignedWhere = { assignedToId: user?.id, status: { not: TicketStatus.DONE }, ...(orgWhere as any) };

  const teamMembers = await db.user.findMany({
    where: { role: "LANDLORD", orgId: orgId ?? "__none__" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const [openRaw, progressRaw, doneRaw, assignedRaw] = await Promise.all([
    showOpen
      ? db.ticket.findMany({
          where: { status: TicketStatus.OPEN, ...orgWhere },
          include: boardInclude,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    showProgress
      ? db.ticket.findMany({
          where: { status: TicketStatus.IN_PROGRESS, ...orgWhere },
          include: boardInclude,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    showDone
      ? db.ticket.findMany({
          where: { status: TicketStatus.DONE, ...orgWhere },
          include: boardInclude,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    showAssigned
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (db.ticket as any).findMany({
          where: assignedWhere,
          include: boardInclude,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const openTickets     = annotateTicketsForLandlordBoard(openRaw);
  const progressTickets = annotateTicketsForLandlordBoard(progressRaw);
  const doneTickets     = annotateTicketsForLandlordBoard(doneRaw);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignedTickets = annotateTicketsForLandlordBoard(assignedRaw as any);

  const filterLabel =
    filter === "open"     ? "Offene Tickets"         :
    filter === "progress" ? "Tickets in Bearbeitung" :
    filter === "done"     ? "Abgeschlossene Tickets" :
    filter === "all"      ? "Alle Tickets"            :
    filter === "assigned" ? "Meine Tickets"           :
                            "Aktive Tickets";

  const filterTabs: { label: string; href: string; active: boolean }[] = [
    { label: "Aktiv",          href: "/tickets",                      active: filter === "" },
    { label: "Offen",          href: "/tickets?filter=open",          active: filter === "open" },
    { label: "In Bearbeitung", href: "/tickets?filter=progress",      active: filter === "progress" },
    { label: "Zugewiesen",     href: "/tickets?filter=assigned",      active: filter === "assigned" },
    { label: "Abgeschlossen",  href: "/tickets?filter=done",          active: filter === "done" },
    { label: "Alle",           href: "/tickets?filter=all",           active: filter === "all" },
  ];

  return (
    <AppShell>
      <div className="stack tickets-page">
        <div>
          <h1 className="page-title">{filterLabel}</h1>
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
        {showAssigned && (
          assignedTickets.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>
              Dir sind aktuell keine offenen Tickets zugewiesen.
            </p>
          ) : (
            <TicketsBoardSection
              title="Mir zugewiesen"
              tone="progress"
              tickets={assignedTickets}
              teamMembers={teamMembers}
            />
          )
        )}
      </div>
    </AppShell>
  );
}

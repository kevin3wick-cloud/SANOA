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

type FilterMode = "open" | "progress" | "all";

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

  const showOpen = filter === "open" || filter === "" || filter === "all";
  const showProgress = filter === "progress" || filter === "" || filter === "all";
  const showDone = filter === "all";

  const [openRaw, progressRaw, doneRaw] = await Promise.all([
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
  ]);

  const openTickets = annotateTicketsForLandlordBoard(openRaw);
  const progressTickets = annotateTicketsForLandlordBoard(progressRaw);
  const doneTickets = annotateTicketsForLandlordBoard(doneRaw);

  const filterLabel =
    filter === "open"
      ? "Offene Tickets"
      : filter === "progress"
      ? "Tickets in Bearbeitung"
      : filter === "all"
      ? "Alle Tickets"
      : "Aktive Tickets";

  const filterTabs: { label: string; href: string; active: boolean }[] = [
    { label: "Aktiv", href: "/tickets", active: filter === "" },
    { label: "Offen", href: "/tickets?filter=open", active: filter === "open" },
    { label: "In Bearbeitung", href: "/tickets?filter=progress", active: filter === "progress" },
    { label: "Alle", href: "/tickets?filter=all", active: filter === "all" },
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
                  background: tab.active ? "var(--accent)" : "var(--card-bg)",
                  color: tab.active ? "#fff" : "var(--fg)",
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
          />
        )}
        {showProgress && (
          <TicketsBoardSection
            title="In Bearbeitung"
            tone="progress"
            tickets={progressTickets}
          />
        )}
        {showDone && (
          <TicketsBoardSection
            title="Erledigt"
            tone="done"
            tickets={doneTickets}
          />
        )}
      </div>
    </AppShell>
  );
}

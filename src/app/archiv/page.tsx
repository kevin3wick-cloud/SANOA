export const dynamic = 'force-dynamic';

import { TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketsBoardSection } from "@/components/tickets/tickets-board-section";
import { db } from "@/lib/db";
import { annotateTicketsForLandlordBoard, chatNotesInclude } from "@/lib/ticket-board-rows";
import { getLandlordSessionUser } from "@/lib/landlord-auth";

const boardInclude = {
  tenant: true,
  ...chatNotesInclude
} as const;

export default async function ArchivPage() {
  const user = await getLandlordSessionUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (user as any)?.orgId ?? null;

  const doneRaw = await db.ticket.findMany({
    where: { status: TicketStatus.DONE, tenant: { orgId } },
    include: boardInclude,
    orderBy: { updatedAt: "desc" }
  });

  const doneTickets = annotateTicketsForLandlordBoard(doneRaw);

  return (
    <AppShell>
      <div className="stack tickets-page">
        <div>
          <h1 className="page-title">Archiv</h1>
          <p className="page-lead muted">
            Alle abgeschlossenen Tickets – {doneTickets.length} Einträge.
          </p>
        </div>
        <TicketsBoardSection
          title="Erledigte Tickets"
          tone="done"
          tickets={doneTickets}
        />
      </div>
    </AppShell>
  );
}

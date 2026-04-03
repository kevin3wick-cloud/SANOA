import { TicketStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { TicketsBoardSection } from "@/components/tickets/tickets-board-section";
import { db } from "@/lib/db";
import {
  annotateTicketsForLandlordBoard,
  chatNotesInclude
} from "@/lib/ticket-board-rows";
import { archiveTenantsPastLeaseEnd } from "@/lib/tenant-lease";

const boardInclude = {
  tenant: true,
  ...chatNotesInclude
} as const;

export default async function TicketsPage() {
  await archiveTenantsPastLeaseEnd();

  const [openRaw, progressRaw, doneRaw] = await Promise.all([
    db.ticket.findMany({
      where: { status: TicketStatus.OPEN },
      include: boardInclude,
      orderBy: { createdAt: "desc" }
    }),
    db.ticket.findMany({
      where: { status: TicketStatus.IN_PROGRESS },
      include: boardInclude,
      orderBy: { createdAt: "desc" }
    }),
    db.ticket.findMany({
      where: { status: TicketStatus.DONE },
      include: boardInclude,
      orderBy: { createdAt: "desc" }
    })
  ]);

  const openTickets = annotateTicketsForLandlordBoard(openRaw);
  const progressTickets = annotateTicketsForLandlordBoard(progressRaw);
  const doneTickets = annotateTicketsForLandlordBoard(doneRaw);

  return (
    <AppShell>
      <div className="stack tickets-page">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-lead muted">
            Nach Status gruppiert – pro Bereich direkt in der Tabelle filtern (z.&nbsp;B. unter
            „Wohnung“).
          </p>
        </div>

        <TicketsBoardSection id="tickets-offen" title="Offen" tickets={openTickets} />
        <TicketsBoardSection title="In Bearbeitung" tickets={progressTickets} />
        <TicketsBoardSection title="Erledigt" tickets={doneTickets} />
      </div>
    </AppShell>
  );
}

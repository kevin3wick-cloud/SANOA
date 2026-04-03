import { requireMieterSession } from "@/lib/tenant-auth";
import { MieterNav } from "../_components/mieter-nav";
import { MieterTicketsList } from "../_components/mieter-tickets-list";
import { MieterTopBar } from "../_components/mieter-top-bar";

export default async function MieterTicketsPage() {
  await requireMieterSession();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="content" style={{ maxWidth: 640, paddingBottom: 40 }}>
        <div className="stack dashboard-stack">
          <MieterTopBar />
          <MieterNav />
          <div>
            <h1 className="page-title">Tickets</h1>
            <p className="page-lead muted">Alle deine Anfragen im Überblick.</p>
          </div>
          <MieterTicketsList title="Alle Tickets" />
        </div>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';

import { requireMieterSession } from "@/lib/tenant-auth";
import { MieterNav } from "../../_components/mieter-nav";
import { MieterNewTicketForm } from "../../_components/mieter-new-ticket-form";
import { MieterTopBar } from "../../_components/mieter-top-bar";

export default async function MieterNewTicketPage() {
  await requireMieterSession();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="content" style={{ maxWidth: 640, paddingBottom: 40 }}>
        <div className="stack dashboard-stack">
          <MieterTopBar />
          <MieterNav />
          <div>
            <h1 className="page-title">Schaden melden</h1>
            <p className="page-lead muted">
              Kurz ausfüllen – wir kümmern uns darum.
            </p>
          </div>
          <div className="card stack">
            <MieterNewTicketForm />
          </div>
        </div>
      </div>
    </main>
  );
}

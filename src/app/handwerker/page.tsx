export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/app-shell";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";
import { HandwerkerPanel } from "./_components/handwerker-panel";

export default async function HandwerkerPage() {
  const user = await getLandlordSessionUser();
  const orgId = (user as any)?.orgId ?? null;

  const contractors = await (db.contractor as any).findMany({
    where: orgId ? { orgId } : {},
    orderBy: [{ trade: "asc" }, { name: "asc" }],
  });

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="page-title">Handwerker</h1>
          <p className="page-lead muted">
            Handwerker erfassen und Kontaktdaten pflegen. Der KI-Agent weist Tickets automatisch dem passenden Handwerker zu.
          </p>
        </div>
        <HandwerkerPanel initialContractors={contractors} />
      </div>
    </AppShell>
  );
}

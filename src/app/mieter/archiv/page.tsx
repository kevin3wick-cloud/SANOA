export const dynamic = 'force-dynamic';

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { tenantOrgFilter } from "@/lib/org-filter";
import { archiveTenantsPastLeaseEnd } from "@/lib/tenant-lease";
import { formatDate } from "@/lib/format";

export default async function MieterArchivPage() {
  await archiveTenantsPastLeaseEnd();
  const user = await getLandlordSessionUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants = await (db.tenant as any).findMany({
    where: { archivedAt: { not: null }, ...tenantOrgFilter(user as any) },
    include: {
      _count: { select: { tickets: true } }
    },
    orderBy: { archivedAt: "desc" }
  });

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="page-title">Mieter-Archiv</h1>
          <p className="page-lead muted">
            Ehemalige Mieter (Mietende erreicht oder manuell archiviert). Kein Zugang mehr zum
            Mieter-Portal.
          </p>
        </div>
        <div className="card">
          {tenants.length === 0 ? (
            <p className="muted">Keine archivierten Mieter.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Wohnung</th>
                    <th>Mietende</th>
                    <th>Archiviert am</th>
                    <th>Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td>
                        <Link className="table-link" href={`/mieter/${tenant.id}`}>
                          {tenant.name}
                        </Link>
                      </td>
                      <td>{tenant.apartment}</td>
                      <td className="muted">
                        {tenant.leaseEnd ? formatDate(tenant.leaseEnd) : "—"}
                      </td>
                      <td className="muted">
                        {tenant.archivedAt ? formatDate(tenant.archivedAt) : "—"}
                      </td>
                      <td>{tenant._count.tickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

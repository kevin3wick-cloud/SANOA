import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TenantCreateForm } from "@/components/mieter/tenant-create-form";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { archiveTenantsPastLeaseEnd } from "@/lib/tenant-lease";

export default async function MieterPage() {
  await archiveTenantsPastLeaseEnd();

  const tenants = await db.tenant.findMany({
    where: { archivedAt: null },
    include: {
      _count: {
        select: { tickets: true }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="page-title">Mieter</h1>
          <p className="page-lead muted">
            Aktive Mieter. Abgelaufene Mietverhältnisse erscheinen im{" "}
            <Link href="/mieter/archiv" className="table-link">
              Archiv
            </Link>
            .
          </p>
        </div>
        <TenantCreateForm />
        <div className="card">
          {tenants.length === 0 ? (
            <p className="muted">Keine Mieter vorhanden.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Wohnung</th>
                    <th>Mietende</th>
                    <th>Anzahl Tickets</th>
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

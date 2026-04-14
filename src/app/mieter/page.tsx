export const dynamic = 'force-dynamic';

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TenantCreateForm } from "@/components/mieter/tenant-create-form";
import { TenantImportForm } from "@/components/mieter/tenant-import-form";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { tenantOrgFilter } from "@/lib/org-filter";
import { archiveTenantsPastLeaseEnd } from "@/lib/tenant-lease";

export default async function MieterPage() {
  await archiveTenantsPastLeaseEnd();
  const user = await getLandlordSessionUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants = await (db.tenant as any).findMany({
    where: { archivedAt: null, ...tenantOrgFilter(user as any) },
    select: {
      id: true,
      name: true,
      apartment: true,
      leaseEnd: true,
      pendingName: true,
      property: { select: { name: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: { name: "asc" },
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
        <TenantImportForm />
        <div className="card">
          {tenants.length === 0 ? (
            <p className="muted">Keine Mieter vorhanden.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Liegenschaft</th>
                    <th>Wohnung</th>
                    <th>Mietende</th>
                    <th>Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Link className="table-link" href={`/mieter/${tenant.id}`}>
                            {tenant.name}
                          </Link>
                          {tenant.pendingName && (
                            <span style={{
                              display: "inline-flex", alignItems: "center",
                              fontSize: 11, fontWeight: 600, padding: "2px 8px",
                              borderRadius: 20, whiteSpace: "nowrap",
                              background: "color-mix(in srgb, #f59e0b 15%, transparent)",
                              color: "#f59e0b",
                              border: "1px solid color-mix(in srgb, #f59e0b 35%, transparent)",
                            }}>
                              Anfrage
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>{tenant.property?.name ?? "—"}</td>
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

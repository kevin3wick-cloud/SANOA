export const dynamic = 'force-dynamic';

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TenantLeaseForm } from "@/components/mieter/tenant-lease-form";
import { MieterResetPasswordForm } from "./_components/mieter-reset-password-form";
import { db } from "@/lib/db";
import { formatCategory, formatDate, formatStatus } from "@/lib/format";

type MieterDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function MieterDetailPage({ params }: MieterDetailProps) {
  const { id } = await params;
  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      tickets: {
        orderBy: { createdAt: "desc" }
      },
      documents: {
        orderBy: { createdAt: "desc" }
      },
      user: true
    }
  });

  if (!tenant) {
    notFound();
  }

  return (
    <AppShell>
      <div className="stack">
        <h1 className="page-title">Mieter-Details</h1>
        <p className="page-lead muted">Stammdaten, Tickets und Dokumente.</p>
        <div className="card stack">
          <p>
            <strong>Name:</strong> {tenant.name}
          </p>
          <p>
            <strong>Kontakt:</strong> {tenant.email} / {tenant.phone}
          </p>
          <p>
            <strong>Wohnung:</strong> {tenant.apartment}
          </p>
          {tenant.archivedAt ? (
            <p className="muted">
              <strong>Archiv:</strong> archiviert am {formatDate(tenant.archivedAt)} – kein
              Mieter-Portal-Zugang.
            </p>
          ) : null}
        </div>

        <TenantLeaseForm
          tenantId={tenant.id}
          leaseStartIso={tenant.leaseStart?.toISOString() ?? null}
          leaseEndIso={tenant.leaseEnd?.toISOString() ?? null}
          isArchived={Boolean(tenant.archivedAt)}
        />

        <div className="card stack">
          <h3 style={{ marginTop: 0 }}>App-Zugang</h3>
          <MieterResetPasswordForm
            tenantId={tenant.id}
            hasAppAccess={Boolean(tenant.user)}
          />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tickets</h3>
          {tenant.tickets.length === 0 ? (
            <p className="muted">Keine Tickets vorhanden.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Kategorie</th>
                  <th>Status</th>
                  <th>Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {tenant.tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link className="table-link" href={`/tickets/${ticket.id}`}>
                        {ticket.title}
                      </Link>
                    </td>
                    <td>{formatCategory(ticket.category)}</td>
                    <td>{formatStatus(ticket.status)}</td>
                    <td>{formatDate(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Dokumente</h3>
          {tenant.documents.length === 0 ? (
            <p className="muted">Keine Dokumente vorhanden (Platzhalter).</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {tenant.documents.map((doc) => (
                <li key={doc.id}>
                  <a className="table-link" href={doc.fileUrl}>
                    {doc.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

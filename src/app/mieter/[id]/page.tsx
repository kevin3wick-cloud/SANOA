export const dynamic = 'force-dynamic';

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TenantLeaseForm } from "@/components/mieter/tenant-lease-form";
import { MieterResetPasswordForm } from "./_components/mieter-reset-password-form";
import { MieterStammdatenForm } from "./_components/mieter-stammdaten-form";
import { MieterDeleteForm } from "./_components/mieter-delete-form";
import { MieterQrForm } from "./_components/mieter-qr-form";
import { db } from "@/lib/db";
import { formatCategory, formatDate, formatStatus } from "@/lib/format";

type MieterDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function MieterDetailPage({ params }: MieterDetailProps) {
  const { id } = await params;

  // Determine the public base URL:
  // 1. NEXT_PUBLIC_APP_URL env var (set in Railway) – most reliable
  // 2. x-forwarded-host from Railway's proxy
  // 3. host header fallback
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "sanoa-production.up.railway.app";
  const proto = hdrs.get("x-forwarded-proto")?.split(",")[0] ?? "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;

  const tenant = await (db.tenant as any).findUnique({
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
        <MieterStammdatenForm
          tenantId={tenant.id}
          name={tenant.name}
          email={tenant.email}
          phone={tenant.phone}
          apartment={tenant.apartment}
          archivedAt={tenant.archivedAt?.toISOString() ?? null}
        />

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
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />
          <h4 style={{ margin: "0 0 4px", fontSize: 14 }}>QR-Code Login</h4>
          <MieterQrForm
            tenantId={tenant.id}
            initialToken={tenant.magicToken ?? null}
            baseUrl={baseUrl}
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
                  <a className="table-link" href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer">
                    {doc.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Danger zone */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Gefahrenzone</p>
          <MieterDeleteForm tenantId={tenant.id} tenantName={tenant.name} />
        </div>
      </div>
    </AppShell>
  );
}

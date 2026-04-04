export const dynamic = 'force-dynamic';

import { DocumentVisibility } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentUploadForm } from "@/components/ui/document-upload-form";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function DokumentePage() {
  const [documents, tenants] = await Promise.all([
    db.document.findMany({
      include: { tenant: true },
      orderBy: { createdAt: "desc" }
    }),
    db.tenant.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="page-title">Dokumente</h1>
          <p className="page-lead muted">Verträge und Unterlagen zentral ablegen.</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Dokument hochladen (PDF)</h3>
          <DocumentUploadForm tenants={tenants} />
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Alle Dokumente</h3>
          {documents.length === 0 ? (
            <p className="muted">Keine Dokumente vorhanden.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mieter</th>
                  <th>Sichtbarkeit</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <a className="table-link" href={doc.fileUrl}>
                        {doc.name}
                      </a>
                    </td>
                    <td>{doc.tenant?.name ?? "Alle Mieter"}</td>
                    <td>
                      {doc.visibility === DocumentVisibility.INTERNAL
                        ? "Intern"
                        : "Mieter sichtbar"}
                    </td>
                    <td>{formatDate(doc.createdAt)}</td>
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

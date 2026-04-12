import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { getMieterSessionUser } from "@/lib/tenant-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Dokument nicht gefunden." }, { status: 404 });
  }

  // Check access: either a landlord from the same org, or the tenant the doc belongs to
  const landlord = await getLandlordSessionUser();
  if (landlord) {
    const orgId = (landlord as any).orgId ?? null;
    if (doc.orgId !== orgId) {
      return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
    }
  } else {
    // Try mieter session
    const mieter = await getMieterSessionUser();
    if (!mieter?.tenant) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    // Tenant may only access docs assigned to them or to all tenants (tenantId null) of their org
    const tenantOrgId = (mieter.tenant as any).orgId ?? null;
    const docIsForThisTenant = doc.tenantId === mieter.tenant.id;
    const docIsForAllTenants = doc.tenantId === null && doc.orgId === tenantOrgId;
    if (!docIsForThisTenant && !docIsForAllTenants) {
      return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
    }
  }

  // fileUrl contains the R2 object key (e.g. "docs/uuid.pdf")
  const r2Key = doc.fileUrl;

  // Generate a pre-signed URL valid for 1 hour
  let signedUrl: string;
  try {
    signedUrl = getPresignedUrl(r2Key, 3600);
  } catch (err) {
    console.error("R2 pre-sign error:", err);
    return NextResponse.json(
      { error: "Datei konnte nicht abgerufen werden." },
      { status: 500 }
    );
  }

  // Redirect browser to the temporary R2 URL
  return NextResponse.redirect(signedUrl, { status: 302 });
}

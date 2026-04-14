// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

// PATCH — landlord approves or rejects a pending name change
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getLandlordSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id: tenantId } = await params;
  const body = await request.json();
  const action = body.action; // "approve" | "reject"

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, pendingName: true, pendingNameReason: true, orgId: true },
  });

  if (!tenant) return NextResponse.json({ error: "Mieter nicht gefunden." }, { status: 404 });
  if (!tenant.pendingName) return NextResponse.json({ error: "Keine offene Anfrage." }, { status: 400 });

  // Org isolation
  const orgId = sessionUser.orgId ?? null;
  if (orgId && tenant.orgId !== orgId) return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });

  if (action === "approve") {
    const oldName = tenant.name;
    const newName = tenant.pendingName;

    await db.$transaction([
      db.tenant.update({
        where: { id: tenantId },
        data: { name: newName, pendingName: null, pendingNameReason: null, pendingNameRequestedAt: null },
      }),
      db.user.updateMany({
        where: { tenantId },
        data: { name: newName },
      }),
    ]);

    return NextResponse.json({ ok: true, approved: true, oldName, newName });
  }

  if (action === "reject") {
    await db.tenant.update({
      where: { id: tenantId },
      data: { pendingName: null, pendingNameReason: null, pendingNameRequestedAt: null },
    });
    return NextResponse.json({ ok: true, approved: false });
  }

  return NextResponse.json({ error: "Ungültige Aktion." }, { status: 400 });
}

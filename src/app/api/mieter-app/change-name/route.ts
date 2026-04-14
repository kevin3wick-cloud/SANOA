// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

// POST — tenant submits a name change request (requires landlord approval)
export async function POST(request: NextRequest) {
  const user = await getMieterSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json();
  const newName = body.newName?.trim();
  const reason = body.reason?.trim();

  if (!newName || newName.length < 2) {
    return NextResponse.json(
      { error: "Bitte geben Sie einen gültigen Namen ein (min. 2 Zeichen)." },
      { status: 400 }
    );
  }
  if (newName.length > 80) {
    return NextResponse.json({ error: "Name darf maximal 80 Zeichen lang sein." }, { status: 400 });
  }
  if (!reason || reason.length < 3) {
    return NextResponse.json(
      { error: "Bitte geben Sie einen Grund an (min. 3 Zeichen)." },
      { status: 400 }
    );
  }

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { name: true, pendingName: true },
  });

  if (!tenant) return NextResponse.json({ error: "Mieter nicht gefunden." }, { status: 404 });

  if (newName === tenant.name) {
    return NextResponse.json({ error: "Der Name ist identisch mit dem aktuellen Namen." }, { status: 400 });
  }

  // Store as pending — landlord must approve before name actually changes
  await db.tenant.update({
    where: { id: user.tenantId },
    data: {
      pendingName: newName,
      pendingNameReason: reason,
      pendingNameRequestedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, pending: true });
}

// GET — check if there's an open pending request
export async function GET() {
  const user = await getMieterSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { pendingName: true, pendingNameReason: true, pendingNameRequestedAt: true },
  });

  return NextResponse.json({
    pendingName: tenant?.pendingName ?? null,
    pendingNameReason: tenant?.pendingNameReason ?? null,
    pendingNameRequestedAt: tenant?.pendingNameRequestedAt ?? null,
  });
}

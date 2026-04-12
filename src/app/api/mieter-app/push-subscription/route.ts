import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

export const runtime = "nodejs";

// GET — return the VAPID public key so the client can subscribe
export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}

// POST — save a new push subscription for the logged-in tenant
export async function POST(request: NextRequest) {
  const mieter = await getMieterSessionUser();
  if (!mieter?.tenant) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, p256dh, auth } = body ?? {};

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Ungültige Subscription." }, { status: 400 });
  }

  // Upsert: update if endpoint already known, otherwise create
  await (db.pushSubscription as any).upsert({
    where: { endpoint },
    update: { p256dh, auth, tenantId: mieter.tenant.id },
    create: { endpoint, p256dh, auth, tenantId: mieter.tenant.id }
  });

  return NextResponse.json({ ok: true });
}

// DELETE — remove subscription (user turned off notifications)
export async function DELETE(request: NextRequest) {
  const mieter = await getMieterSessionUser();
  if (!mieter?.tenant) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { endpoint } = (await request.json()) ?? {};
  if (endpoint) {
    await (db.pushSubscription as any).deleteMany({
      where: { endpoint, tenantId: mieter.tenant.id }
    });
  }
  return NextResponse.json({ ok: true });
}

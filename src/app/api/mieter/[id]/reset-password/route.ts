import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const landlord = await getLandlordSessionUser();
  if (!landlord) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id: tenantId } = await params;

  const body = (await request.json()) as { newPassword?: string };
  const { newPassword } = body;

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen lang sein." },
      { status: 400 }
    );
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Mieter nicht gefunden." }, { status: 404 });
  }

  const tenantUser = await db.user.findFirst({
    where: { tenantId, role: "MIETER" },
  });
  if (!tenantUser) {
    return NextResponse.json(
      { error: "Kein App-Zugang für diesen Mieter vorhanden." },
      { status: 404 }
    );
  }

  await db.user.update({
    where: { id: tenantUser.id },
    data: { password: newPassword },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

type Body = { orgRole?: "ORG_ADMIN" | "ORG_USER" | "ORG_GUEST" };

// PATCH - update orgRole of a vermieter user (Sanoa admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getLandlordSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as Body;
  const { orgRole } = body;

  if (!orgRole || !["ORG_ADMIN", "ORG_USER", "ORG_GUEST"].includes(orgRole)) {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target || target.role !== "LANDLORD") {
    return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.user as any).update({ where: { id }, data: { orgRole } });
  return NextResponse.json({ ok: true });
}

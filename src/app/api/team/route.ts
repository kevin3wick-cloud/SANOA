import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";
import { OrgRole } from "@prisma/client";

type Body = {
  name?: string;
  email?: string;
  password?: string;
  orgRole?: OrgRole;
};

// GET - list all team members (org admin only)
export async function GET() {
  const currentUser = await getLandlordSessionUser();
  if (
    !currentUser ||
    currentUser.role !== "LANDLORD" ||
    currentUser.orgRole !== "ORG_ADMIN"
  ) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const users = await db.user.findMany({
    where: { role: "LANDLORD" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, orgRole: true, createdAt: true },
  });

  return NextResponse.json({ users });
}

// POST - create new team member (org admin only)
export async function POST(request: NextRequest) {
  const currentUser = await getLandlordSessionUser();
  if (
    !currentUser ||
    currentUser.role !== "LANDLORD" ||
    currentUser.orgRole !== "ORG_ADMIN"
  ) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const body = (await request.json()) as Body;
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const orgRole = body.orgRole ?? "ORG_USER";

  if (!name || !email) {
    return NextResponse.json({ error: "Name und E-Mail sind erforderlich." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Passwort mindestens 6 Zeichen." }, { status: 400 });
  }
  if (!["ORG_ADMIN", "ORG_USER", "ORG_GUEST"].includes(orgRole)) {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Diese E-Mail ist bereits vergeben." }, { status: 409 });
  }

  const user = await db.user.create({
    data: { name, email, password, role: "LANDLORD", orgRole },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}

// DELETE - remove team member (org admin only, cannot delete self)
export async function DELETE(request: NextRequest) {
  const currentUser = await getLandlordSessionUser();
  if (
    !currentUser ||
    currentUser.role !== "LANDLORD" ||
    currentUser.orgRole !== "ORG_ADMIN"
  ) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }
  if (id === currentUser.id) {
    return NextResponse.json({ error: "Sie können Ihr eigenes Konto nicht löschen." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target || target.role !== "LANDLORD") {
    return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

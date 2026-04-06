import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

type Body = {
  name?: string;
  email?: string;
  password?: string;
  isOrgAdmin?: boolean;
};

export async function POST(request: NextRequest) {
  const currentUser = await getLandlordSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const body = (await request.json()) as Body;
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const isOrgAdmin = body.isOrgAdmin === true;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name und E-Mail sind erforderlich." },
      { status: 400 }
    );
  }
  if (!email.includes("@")) {
    return NextResponse.json(
      { error: "Bitte eine gültige E-Mail-Adresse eingeben." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Passwort mindestens 6 Zeichen." },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Diese E-Mail ist bereits vergeben." },
      { status: 409 }
    );
  }

  // Every new vermieter gets their own unique orgId (organization isolation)
  const orgId = randomUUID();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (db.user as any).create({
    data: {
      name,
      email,
      password,
      role: "LANDLORD",
      orgRole: isOrgAdmin ? "ORG_ADMIN" : "ORG_USER",
      orgId,
    },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}

export async function GET() {
  const currentUser = await getLandlordSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const users = await db.user.findMany({
    where: { role: { in: ["LANDLORD", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: { id: true, name: true, email: true, role: true, orgRole: true, orgId: true, createdAt: true } as any,
  });

  return NextResponse.json({ users });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getLandlordSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }
  if (id === currentUser.id) {
    return NextResponse.json(
      { error: "Sie können Ihr eigenes Konto nicht löschen." },
      { status: 400 }
    );
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

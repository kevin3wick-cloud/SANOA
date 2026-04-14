// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const name = body.name?.trim();
  const address = body.address?.trim() || null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
  }

  const property = await db.property.update({
    where: { id },
    data: { name, address },
  });

  return NextResponse.json(property);
}

export async function DELETE(_req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await params;
  await db.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

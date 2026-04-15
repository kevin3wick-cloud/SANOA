// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const contractor = await db.contractor.update({
    where: { id },
    data: {
      name:  body.name?.trim()  || undefined,
      email: body.email?.trim().toLowerCase() || undefined,
      phone: body.phone?.trim() || null,
      trade: body.trade?.trim() || null,
    },
  });

  return NextResponse.json(contractor);
}

export async function DELETE(_req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await params;
  await db.contractor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

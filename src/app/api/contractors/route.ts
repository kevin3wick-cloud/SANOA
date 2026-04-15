// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const orgId = user.orgId ?? null;

  const contractors = await db.contractor.findMany({
    where: orgId ? { orgId } : {},
    orderBy: [{ trade: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(contractors);
}

export async function POST(req: NextRequest) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const orgId = user.orgId ?? null;

  const body = await req.json();
  const name  = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim() || null;
  const trade = body.trade?.trim() || null;

  if (!name || !email) return NextResponse.json({ error: "Name und E-Mail erforderlich." }, { status: 400 });

  const contractor = await db.contractor.create({
    data: { name, email, phone, trade, orgId },
  });

  return NextResponse.json(contractor, { status: 201 });
}

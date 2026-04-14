// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

// POST — add a team member to a property
export async function POST(req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const userId = body.userId?.trim();

  if (!userId) return NextResponse.json({ error: "userId fehlt." }, { status: 400 });

  await db.propertyAssignee.upsert({
    where: { propertyId_userId: { propertyId, userId } },
    create: { propertyId, userId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// DELETE — remove a team member from a property
export async function DELETE(req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const userId = body.userId?.trim();

  if (!userId) return NextResponse.json({ error: "userId fehlt." }, { status: 400 });

  await db.propertyAssignee.deleteMany({ where: { propertyId, userId } });
  return NextResponse.json({ ok: true });
}

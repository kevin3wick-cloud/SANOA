// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const orgId = user.orgId ?? null;

  const properties = await db.property.findMany({
    where: orgId ? { orgId } : {},
    orderBy: { name: "asc" },
    include: {
      assignees: {
        include: { /* we join user manually below */ }
      },
      _count: { select: { tenants: true } },
    },
  });

  // Enrich assignees with user data
  const enriched = await Promise.all(properties.map(async (p) => {
    const assigneeUsers = await db.user.findMany({
      where: { id: { in: p.assignees.map(a => a.userId) } },
      select: { id: true, name: true, email: true },
    });
    return { ...p, assigneeUsers };
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const orgId = user.orgId ?? null;

  const body = await req.json();
  const name = body.name?.trim();
  const address = body.address?.trim() || null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
  }

  const property = await db.property.create({
    data: { name, address, orgId },
  });

  return NextResponse.json(property, { status: 201 });
}

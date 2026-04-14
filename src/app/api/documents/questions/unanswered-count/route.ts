// @ts-nocheck
import { NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ count: 0 });
  const orgId = user.orgId ?? null;

  const count = await db.documentQuestion.count({
    where: {
      answeredAt: null,
      ...(orgId ? { orgId } : {}),
    },
  });

  return NextResponse.json({ count });
}

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { DocumentVisibility } from "@prisma/client";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const filter = request.nextUrl.searchParams.get("filter") ?? "current";

  const where: Prisma.DocumentWhereInput = {
    visibility: DocumentVisibility.TENANT_VISIBLE,
    OR: [{ tenantId: user.tenantId }, { tenantId: null }]
  };

  if (filter === "archive") {
    where.archivedAt = { not: null };
  } else if (filter === "current") {
    where.archivedAt = null;
  }

  const documents = await db.document.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(documents);
}

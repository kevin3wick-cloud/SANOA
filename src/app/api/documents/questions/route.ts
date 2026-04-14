// @ts-nocheck
import { NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

// GET — landlord fetches all open questions (unanswered first)
export async function GET() {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const orgId = user.orgId ?? null;

  const questions = await db.documentQuestion.findMany({
    where: orgId ? { orgId } : {},
    orderBy: [{ answeredAt: "asc" }, { createdAt: "asc" }],
    include: {
      document: { select: { id: true, name: true, kind: true } },
    },
  });

  // Enrich with tenant name
  const enriched = await Promise.all(questions.map(async (q) => {
    const tenant = await db.tenant.findUnique({
      where: { id: q.tenantId },
      select: { name: true },
    });
    return { ...q, tenantName: tenant?.name ?? "Unbekannt" };
  }));

  return NextResponse.json(enriched);
}

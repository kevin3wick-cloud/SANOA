import { NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { tenantOrgFilter } from "@/lib/org-filter";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ count: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = await (db.tenant as any).count({
    where: {
      pendingName: { not: null },
      archivedAt: null,
      ...tenantOrgFilter(user as any),
    },
  });

  return NextResponse.json({ count });
}

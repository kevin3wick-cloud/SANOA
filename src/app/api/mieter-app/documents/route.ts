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

  // Get tenant's orgId for document isolation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = await (db.tenant as any).findUnique({
    where: { id: user.tenantId },
    select: { orgId: true },
  }) as { orgId: string | null } | null;
  const orgId = tenant?.orgId ?? null;

  const filter = request.nextUrl.searchParams.get("filter") ?? "current";

  const where: Prisma.DocumentWhereInput = {
    visibility: DocumentVisibility.TENANT_VISIBLE,
    // Always scope to this landlord's organisation
    ...(orgId ? { orgId } : {}),
  };

  if (filter === "all-tenants") {
    where.tenantId = null;
  } else {
    where.OR = [{ tenantId: user.tenantId }, { tenantId: null }];
  }

  if (filter === "archive") {
    where.archivedAt = { not: null };
  } else if (filter === "current") {
    where.archivedAt = null;
  }

  const documents = await db.document.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });

  // Replace raw R2 key with proxy route URL so the client can open the file
  const mapped = documents.map((doc) => ({
    ...doc,
    fileUrl: `/api/documents/${doc.id}/file`,
  }));

  return NextResponse.json(mapped);
}

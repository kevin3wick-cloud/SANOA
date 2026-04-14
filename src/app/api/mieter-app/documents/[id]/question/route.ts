// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";

// POST — tenant asks a question about a document
export async function POST(req: NextRequest, { params }) {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id: documentId } = await params;
  const body = await req.json();
  const question = body.question?.trim();

  if (!question || question.length < 3) {
    return NextResponse.json({ error: "Bitte geben Sie eine Frage ein." }, { status: 400 });
  }

  // Get tenant's orgId
  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { orgId: true },
  });

  const q = await db.documentQuestion.create({
    data: {
      documentId,
      tenantId: user.tenantId,
      orgId: tenant?.orgId ?? null,
      question,
    },
  });

  return NextResponse.json({ ok: true, id: q.id }, { status: 201 });
}

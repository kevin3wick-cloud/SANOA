import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/mieter/[id]/magic-token  → generate (or regenerate) a magic login token
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Mieter nicht gefunden." }, { status: 404 });
  }

  // Generate a 48-byte (96 hex chars) cryptographically secure token
  const magicToken = randomBytes(48).toString("hex");

  await (db.tenant as any).update({
    where: { id },
    data: { magicToken }
  });

  return NextResponse.json({ magicToken });
}

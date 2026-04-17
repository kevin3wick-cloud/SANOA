import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const orgId = (user as any).orgId as string | null;
  if (!orgId) return NextResponse.json({ senderName: "", replyToEmail: "" });

  const settings = await (db as any).orgSettings.findUnique({ where: { orgId } });
  return NextResponse.json({
    senderName: settings?.senderName ?? "",
    replyToEmail: settings?.replyToEmail ?? "",
  });
}

export async function POST(request: NextRequest) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const orgId = (user as any).orgId as string | null;
  if (!orgId) return NextResponse.json({ error: "Keine Organisation." }, { status: 400 });

  const body = await request.json() as { senderName?: string; replyToEmail?: string };
  const senderName = body.senderName?.trim() ?? "";
  const replyToEmail = body.replyToEmail?.trim() ?? "";

  if (replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
  }

  await (db as any).orgSettings.upsert({
    where: { orgId },
    update: { senderName: senderName || null, replyToEmail: replyToEmail || null },
    create: { orgId, senderName: senderName || null, replyToEmail: replyToEmail || null },
  });

  return NextResponse.json({ ok: true });
}

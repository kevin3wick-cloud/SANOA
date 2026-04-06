import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const admin = await getLandlordSessionUser();
  if (!admin || (admin.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string; newPassword?: string };
  const { userId, newPassword } = body;

  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen lang sein." },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || (target.role as string) !== "LANDLORD") {
    return NextResponse.json({ error: "Vermieter nicht gefunden." }, { status: 404 });
  }

  await db.user.update({
    where: { id: userId },
    data: { password: newPassword },
  });

  return NextResponse.json({ ok: true });
}

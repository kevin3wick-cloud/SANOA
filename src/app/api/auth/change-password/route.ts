import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getLandlordSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Neues Passwort muss mindestens 6 Zeichen lang sein." },
      { status: 400 }
    );
  }
  if (user.password !== currentPassword) {
    return NextResponse.json({ error: "Aktuelles Passwort ist falsch." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { password: newPassword },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import {
  createMieterSessionToken,
  MIETER_SESSION_COOKIE,
  mieterSessionCookieOptions
} from "@/lib/tenant-auth";
import { db } from "@/lib/db";

type Body = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body;
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim() ?? "";

  if (!email || password.length < 3) {
    return NextResponse.json(
      { error: "Bitte E-Mail und Passwort eingeben." },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  if (!user || user.role !== "MIETER" || !user.tenant) {
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen." },
      { status: 401 }
    );
  }

  if (user.tenant.archivedAt) {
    return NextResponse.json(
      {
        error:
          "Ihr Zugang ist beendet (Mietende erreicht). Bei Fragen wenden Sie sich an die Verwaltung."
      },
      { status: 403 }
    );
  }

  if (user.password !== password) {
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen." },
      { status: 401 }
    );
  }

  const token = createMieterSessionToken(user.id);
  const response = NextResponse.json({
    ok: true,
    tenant: {
      name: user.tenant.name,
      apartment: user.tenant.apartment,
      email: user.email
    }
  });
  response.cookies.set(MIETER_SESSION_COOKIE, token, mieterSessionCookieOptions());
  return response;
}

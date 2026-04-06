import { NextRequest, NextResponse } from "next/server";
import {
  createLandlordSessionToken,
  LANDLORD_SESSION_COOKIE,
  landlordSessionCookieOptions,
} from "@/lib/landlord-auth";
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

  const user = await db.user.findUnique({ where: { email } });

  if (!user || (user.role !== "LANDLORD" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen." },
      { status: 401 }
    );
  }

  if (user.password !== password) {
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen." },
      { status: 401 }
    );
  }

  const token = createLandlordSessionToken(user.id);
  const response = NextResponse.json({
    ok: true,
    user: { name: user.name, email: user.email, role: user.role },
  });
  response.cookies.set(LANDLORD_SESSION_COOKIE, token, landlordSessionCookieOptions());
  return response;
}

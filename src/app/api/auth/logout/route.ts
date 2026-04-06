import { NextResponse } from "next/server";
import { LANDLORD_SESSION_COOKIE } from "@/lib/landlord-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LANDLORD_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

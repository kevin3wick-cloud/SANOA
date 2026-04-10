import { NextRequest, NextResponse } from "next/server";
import {
  createMieterSessionToken,
  MIETER_SESSION_COOKIE,
  mieterSessionCookieOptions
} from "@/lib/tenant-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 32) {
    return NextResponse.redirect(new URL("/mieter-app/login?error=invalid", _request.url));
  }

  // Find tenant by magic token
  const tenant = await (db.tenant as any).findUnique({
    where: { magicToken: token },
    include: { user: true }
  });

  if (!tenant || !tenant.user) {
    return NextResponse.redirect(new URL("/mieter-app/login?error=invalid", _request.url));
  }

  // Don't allow login for archived tenants
  if (tenant.archivedAt) {
    return NextResponse.redirect(new URL("/mieter-app/login?error=archived", _request.url));
  }

  // Create session and redirect to dashboard
  const sessionToken = createMieterSessionToken(tenant.user.id);
  const response = NextResponse.redirect(new URL("/mieter-app/dashboard", _request.url));
  response.cookies.set(MIETER_SESSION_COOKIE, sessionToken, mieterSessionCookieOptions());
  return response;
}

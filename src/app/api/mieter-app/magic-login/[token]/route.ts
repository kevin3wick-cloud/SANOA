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
    // Use relative redirect — stays on the correct public domain
    return NextResponse.redirect(new URL("/mieter-app/login?error=invalid", "https://sanoa-production.up.railway.app"));
  }

  // Find tenant by magic token
  const tenant = await (db.tenant as any).findUnique({
    where: { magicToken: token },
    include: { user: true }
  });

  if (!tenant || !tenant.user) {
    return NextResponse.redirect(new URL("/mieter-app/login?error=invalid", "https://sanoa-production.up.railway.app"));
  }

  // Don't allow login for archived tenants
  if (tenant.archivedAt) {
    return NextResponse.redirect(new URL("/mieter-app/login?error=archived", "https://sanoa-production.up.railway.app"));
  }

  // Create session cookie and redirect to dashboard
  const sessionToken = createMieterSessionToken(tenant.user.id);

  // Use a plain Response with a relative Location header so the browser
  // stays on the correct public hostname (not Railway's internal localhost:8080)
  const response = new Response(null, {
    status: 302,
    headers: { Location: "/mieter-app/dashboard" }
  });
  response.headers.set(
    "Set-Cookie",
    `${MIETER_SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );
  return response;
}

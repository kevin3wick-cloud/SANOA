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

  // Look up via Tenant.email (scoped) — allows same email across different landlords
  const tenants = await db.tenant.findMany({
    where: { email },
    include: { tickets: false },
  }) as Array<{ id: string; name: string; apartment: string; email: string; archivedAt: Date | null }>;

  // Find the User for each tenant and check password
  let matchedUser: { id: string; password: string; role: string } | null = null;
  let matchedTenant: typeof tenants[0] | null = null;

  for (const tenant of tenants) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = await (db.user as any).findUnique({ where: { tenantId: tenant.id } });
    if (u && u.role === "MIETER" && u.password === password) {
      if (tenant.archivedAt) {
        // Keep looking for non-archived match, but remember this one
        continue;
      }
      matchedUser = u;
      matchedTenant = tenant;
      break;
    }
  }

  if (!matchedUser || !matchedTenant) {
    // Check if there's an archived match to give a better error
    for (const tenant of tenants) {
      if (tenant.archivedAt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = await (db.user as any).findUnique({ where: { tenantId: tenant.id } });
        if (u && u.password === password) {
          return NextResponse.json(
            { error: "Ihr Zugang ist beendet (Mietende erreicht). Bei Fragen wenden Sie sich an die Verwaltung." },
            { status: 403 }
          );
        }
      }
    }
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen." },
      { status: 401 }
    );
  }

  const token = createMieterSessionToken(matchedUser.id);
  const response = NextResponse.json({
    ok: true,
    tenant: {
      name: matchedTenant.name,
      apartment: matchedTenant.apartment,
      email: matchedTenant.email,
    }
  });
  response.cookies.set(MIETER_SESSION_COOKIE, token, mieterSessionCookieOptions());
  return response;
}

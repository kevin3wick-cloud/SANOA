import { NextRequest, NextResponse } from "next/server";

const LANDLORD_COOKIE = "sanoa_landlord_session";
const MIETER_COOKIE = "sanoa_mieter_session";

const LANDLORD_ROUTES = [
  "/dashboard",
  "/admin",
  "/mieter/",
  "/tickets",
  "/einstellungen",
  "/dokumente",
];

const MIETER_ROUTES = [
  "/mieter-app/dashboard",
  "/mieter-app/tickets",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect landlord/admin routes
  if (LANDLORD_ROUTES.some((p) => pathname.startsWith(p))) {
    const session = request.cookies.get(LANDLORD_COOKIE);
    if (!session?.value) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect mieter-app routes
  if (MIETER_ROUTES.some((p) => pathname.startsWith(p))) {
    const session = request.cookies.get(MIETER_COOKIE);
    if (!session?.value) {
      return NextResponse.redirect(new URL("/mieter-app/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/mieter/:path*",
    "/tickets/:path*",
    "/einstellungen/:path*",
    "/dokumente/:path*",
    "/mieter-app/dashboard/:path*",
    "/mieter-app/tickets/:path*",
  ],
};

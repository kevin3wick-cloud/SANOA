import { createHmac, timingSafeEqual } from "crypto";
import type { Tenant, User } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export type MieterSessionUser = User & { tenant: Tenant };

export const MIETER_SESSION_COOKIE = "sanoa_mieter_session";

const MAX_AGE_SEC = 60 * 60 * 24 * 14;

function sessionSecret() {
  return process.env.TENANT_SESSION_SECRET ?? "dev-mieter-session-secret";
}

export function createMieterSessionToken(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${userId}:${exp}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

function parseMieterSessionToken(token: string): { userId: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = raw.lastIndexOf(":");
    if (lastColon === -1) return null;
    const sig = raw.slice(lastColon + 1);
    const payload = raw.slice(0, lastColon);
    const secondColon = payload.lastIndexOf(":");
    if (secondColon === -1) return null;
    const userId = payload.slice(0, secondColon);
    const expStr = payload.slice(secondColon + 1);
    const exp = Number.parseInt(expStr, 10);
    if (!userId || !Number.isFinite(exp)) return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    const expected = createHmac("sha256", sessionSecret())
      .update(`${userId}:${expStr}`)
      .digest("hex");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { userId };
  } catch {
    return null;
  }
}

export async function getMieterSessionUser() {
  const jar = await cookies();
  const token = jar.get(MIETER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const parsed = parseMieterSessionToken(token);
  if (!parsed) return null;
  const user = await db.user.findUnique({
    where: { id: parsed.userId },
    include: { tenant: true }
  });
  if (!user || user.role !== "MIETER" || !user.tenantId || !user.tenant) {
    return null;
  }
  if (user.tenant.archivedAt) {
    return null;
  }
  return user;
}

export async function requireMieterSession(): Promise<MieterSessionUser> {
  const user = await getMieterSessionUser();
  if (!user?.tenant) {
    redirect("/mieter-app/login");
  }
  return user as MieterSessionUser;
}

export function mieterSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC
  };
}

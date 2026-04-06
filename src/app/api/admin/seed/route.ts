import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// One-time endpoint to create the initial admin user.
// Call GET /api/admin/seed once after first deployment.
// The endpoint does nothing if the admin already exists.
export async function GET() {
  const email = "info@sanoa.tech";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: "Admin existiert bereits.", id: existing.id });
  }

  const user = await db.user.create({
    data: {
      email,
      name: "Sanoa Admin",
      password: process.env.ADMIN_SEED_PASSWORD ?? "SanoaAdmin2026!",
      role: "ADMIN",
    },
  });

  return NextResponse.json({ message: "Admin erfolgreich erstellt.", id: user.id });
}

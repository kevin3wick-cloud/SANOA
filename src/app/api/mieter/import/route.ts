import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import {
  archivedAtForLeaseEnd,
  parseLeaseEndDateInput,
  parseOptionalDateInput
} from "@/lib/tenant-lease";

export type ImportRow = {
  name: string;
  email: string;
  phone: string;
  apartment: string;
  password: string;
  leaseStart: string;
  leaseEnd?: string;
  propertyName?: string; // optional: matched to Property.name in this org
};

export type ImportResult = {
  row: number;
  name: string;
  ok: boolean;
  error?: string;
};

export async function POST(request: NextRequest) {
  const sessionUser = await getLandlordSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId: string | null = (sessionUser as any)?.orgId ?? null;

  const body = (await request.json()) as { rows?: ImportRow[] };
  const rows = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Keine Zeilen übergeben." }, { status: 400 });
  }
  if (rows.length > 200) {
    return NextResponse.json({ error: "Maximal 200 Mieter pro Import." }, { status: 400 });
  }

  const results: ImportResult[] = [];

  // Pre-load all properties for this org so we can match by name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgProperties = await (db.property as any).findMany({
    where: orgId ? { orgId } : {},
    select: { id: true, name: true },
  }) as { id: string; name: string }[];

  function resolvePropertyId(rawName?: string): string | null {
    if (!rawName?.trim()) return null;
    const needle = rawName.trim().toLowerCase();
    const match = orgProperties.find(p => p.name.toLowerCase() === needle);
    return match?.id ?? null;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based + header row

    const name      = row.name?.trim();
    const email     = row.email?.trim().toLowerCase();
    const phone     = row.phone?.trim();
    const apartment = row.apartment?.trim();
    const password  = row.password?.trim() ?? "";
    const propertyId = resolvePropertyId(row.propertyName);

    // Validate required fields
    if (!name || !email || !phone || !apartment) {
      results.push({ row: rowNum, name: name || "?", ok: false, error: "Name, E-Mail, Telefon und Wohnung sind Pflicht." });
      continue;
    }
    if (!email.includes("@")) {
      results.push({ row: rowNum, name, ok: false, error: "Ungültige E-Mail-Adresse." });
      continue;
    }
    if (password.length < 6) {
      results.push({ row: rowNum, name, ok: false, error: "Passwort muss mind. 6 Zeichen haben." });
      continue;
    }

    const leaseStart = parseOptionalDateInput(row.leaseStart?.trim());
    if (!leaseStart) {
      results.push({ row: rowNum, name, ok: false, error: "Ungültiges oder fehlendes Mietbeginn-Datum." });
      continue;
    }
    const leaseEnd = parseLeaseEndDateInput(row.leaseEnd?.trim());
    if (row.leaseEnd?.trim() && !leaseEnd) {
      results.push({ row: rowNum, name, ok: false, error: "Ungültiges Mietende-Datum." });
      continue;
    }

    const archivedAt = archivedAtForLeaseEnd(leaseEnd);

    // Check for existing tenant with this email within THIS org only (not globally)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingTenant = await (db.tenant as any).findFirst({
      where: { email, orgId },
    }) as { id: string; archivedAt: Date | null } | null;

    if (existingTenant) {
      if (!existingTenant.archivedAt) {
        results.push({ row: rowNum, name, ok: false, error: `E-Mail «${email}» gehört bereits einem aktiven Mieter bei diesem Vermieter.` });
        continue;
      }
      // Reactivate archived tenant within this org
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingUser = await (db.user as any).findUnique({ where: { tenantId: existingTenant.id } });
      try {
        await db.$transaction(async (tx) => {
          await (tx.tenant as any).update({
            where: { id: existingTenant.id },
            data: { name, email, phone, apartment, leaseStart, leaseEnd, archivedAt, orgId, magicToken: null, ...(propertyId ? { propertyId } : {}) }
          });
          if (existingUser) {
            await tx.user.update({ where: { id: existingUser.id }, data: { password, name } });
          }
        });
        results.push({ row: rowNum, name, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        results.push({ row: rowNum, name, ok: false, error: msg || "Datenbankfehler." });
      }
      continue;
    }

    // New tenant — store User.email as email__orgId so the same real email
    // can exist across different landlord organisations
    const userEmail = orgId ? `${email}__${orgId}` : email;
    try {
      await db.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenant = await (tx.tenant as any).create({
          data: { name, email, phone, apartment, leaseStart, leaseEnd, archivedAt, orgId, ...(propertyId ? { propertyId } : {}) }
        });
        await tx.user.create({
          data: { email: userEmail, password, name, role: UserRole.MIETER, tenantId: tenant.id }
        });
      });
      results.push({ row: rowNum, name, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      results.push({
        row: rowNum,
        name,
        ok: false,
        error: msg.includes("Unique") ? `E-Mail «${email}» ist bereits vergeben.` : "Datenbankfehler."
      });
    }
  }

  const created = results.filter((r) => r.ok).length;
  const failed  = results.filter((r) => !r.ok).length;
  return NextResponse.json({ created, failed, results });
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import {
  archivedAtForLeaseEnd,
  parseLeaseEndDateInput,
  parseOptionalDateInput
} from "@/lib/tenant-lease";

type CreateTenantBody = {
  name?: string;
  email?: string;
  phone?: string;
  apartment?: string;
  password?: string;
  leaseStart?: string;
  leaseEnd?: string;
  propertyId?: string;
};

export async function POST(request: NextRequest) {
  const sessionUser = await getLandlordSessionUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId: string | null = (sessionUser as any)?.orgId ?? null;

  const body = (await request.json()) as CreateTenantBody;
  const name = body.name?.trim();
  const emailRaw = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const apartment = body.apartment?.trim();
  const password = body.password ?? "";
  const propertyId = body.propertyId?.trim() || null;

  if (!name || !emailRaw || !phone || !apartment) {
    return NextResponse.json(
      { error: "Name, E-Mail, Telefon und Wohnung sind erforderlich." },
      { status: 400 }
    );
  }

  if (!emailRaw.includes("@")) {
    return NextResponse.json(
      { error: "Bitte eine gültige E-Mail-Adresse eingeben." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Passwort für das Mieter-Portal mindestens 6 Zeichen." },
      { status: 400 }
    );
  }

  const leaseStartRaw = body.leaseStart?.trim();
  if (!leaseStartRaw) {
    return NextResponse.json(
      { error: "Mietbeginn ist erforderlich." },
      { status: 400 }
    );
  }
  const leaseStart = parseOptionalDateInput(leaseStartRaw);
  if (!leaseStart) {
    return NextResponse.json({ error: "Ungültiges Mietbeginn-Datum." }, { status: 400 });
  }
  const leaseEnd = parseLeaseEndDateInput(body.leaseEnd);
  if (body.leaseEnd?.trim() && !leaseEnd) {
    return NextResponse.json({ error: "Ungültiges Mietende-Datum." }, { status: 400 });
  }

  const archivedAt = archivedAtForLeaseEnd(leaseEnd);

  // Check for existing tenant with this email within THIS org only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingTenant = await (db.tenant as any).findFirst({
    where: { email: emailRaw, orgId },
  }) as { id: string; archivedAt: Date | null } | null;

  if (existingTenant) {
    if (!existingTenant.archivedAt) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bei diesem Vermieter bereits vergeben. Bitte andere E-Mail wählen." },
        { status: 409 }
      );
    }
    // Reactivate archived tenant in this org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingUser = await (db.user as any).findUnique({ where: { tenantId: existingTenant.id } });
    try {
      await db.$transaction(async (tx) => {
        await (tx.tenant as any).update({
          where: { id: existingTenant.id },
          data: { name, email: emailRaw, phone, apartment, leaseStart, leaseEnd, archivedAt, orgId, magicToken: null }
        });
        if (existingUser) {
          await tx.user.update({ where: { id: existingUser.id }, data: { password, name } });
        }
      });
      return NextResponse.json({ id: existingTenant.id }, { status: 201 });
    } catch (e) {
      throw e;
    }
  }

  // Also check if email belongs to a landlord account (globally — landlords are always unique)
  const landlordUser = await db.user.findUnique({ where: { email: emailRaw } });
  if (landlordUser && landlordUser.role !== "MIETER") {
    return NextResponse.json(
      { error: "Diese E-Mail gehört bereits einem Vermieter-Konto." },
      { status: 409 }
    );
  }

  // New tenant — use email__orgId as User.email so same real email
  // can exist across different landlord organisations
  const userEmail = orgId ? `${emailRaw}__${orgId}` : emailRaw;

  try {
    const tenant = await db.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = await (tx.tenant as any).create({
        data: {
          name,
          email: emailRaw,
          phone,
          apartment,
          leaseStart,
          leaseEnd,
          archivedAt,
          orgId,
          ...(propertyId ? { propertyId } : {}),
        }
      });
      await tx.user.create({
        data: {
          email: userEmail,
          password,
          name,
          role: UserRole.MIETER,
          tenantId: t.id
        }
      });
      return t;
    });

    return NextResponse.json({ id: tenant.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits vergeben." },
        { status: 409 }
      );
    }
    throw e;
  }
}

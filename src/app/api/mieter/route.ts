import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
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
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateTenantBody;
  const name = body.name?.trim();
  const emailRaw = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const apartment = body.apartment?.trim();
  const password = body.password ?? "";

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

  const leaseStart = parseOptionalDateInput(body.leaseStart);
  const leaseEnd = parseLeaseEndDateInput(body.leaseEnd);
  if (body.leaseStart?.trim() && !leaseStart) {
    return NextResponse.json({ error: "Ungültiges Mietbeginn-Datum." }, { status: 400 });
  }
  if (body.leaseEnd?.trim() && !leaseEnd) {
    return NextResponse.json({ error: "Ungültiges Mietende-Datum." }, { status: 400 });
  }

  const archivedAt = archivedAtForLeaseEnd(leaseEnd);

  const existingUser = await db.user.findUnique({
    where: { email: emailRaw }
  });
  if (existingUser) {
    return NextResponse.json(
      {
        error:
          "Diese E-Mail ist bereits vergeben (Vermieter- oder Mieter-Konto). Bitte andere E-Mail wählen."
      },
      { status: 409 }
    );
  }

  try {
    const tenant = await db.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name,
          email: emailRaw,
          phone,
          apartment,
          leaseStart,
          leaseEnd,
          archivedAt
        }
      });
      await tx.user.create({
        data: {
          email: emailRaw,
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

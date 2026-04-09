import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  archivedAtForLeaseEnd,
  parseLeaseEndDateInput,
  parseOptionalDateInput
} from "@/lib/tenant-lease";

type PatchBody = {
  leaseStart?: string | null;
  leaseEnd?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  apartment?: string;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as PatchBody;

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Mieter nicht gefunden." }, { status: 404 });
  }

  let leaseStart = tenant.leaseStart;
  if (body.leaseStart !== undefined) {
    if (body.leaseStart === null || body.leaseStart === "") {
      leaseStart = null;
    } else {
      const parsed = parseOptionalDateInput(String(body.leaseStart));
      if (!parsed) {
        return NextResponse.json({ error: "Ungültiges Startdatum." }, { status: 400 });
      }
      leaseStart = parsed;
    }
  }

  let leaseEnd = tenant.leaseEnd;
  if (body.leaseEnd !== undefined) {
    if (body.leaseEnd === null || body.leaseEnd === "") {
      leaseEnd = null;
    } else {
      const parsed = parseLeaseEndDateInput(String(body.leaseEnd));
      if (!parsed) {
        return NextResponse.json({ error: "Ungültiges Enddatum." }, { status: 400 });
      }
      leaseEnd = parsed;
    }
  }

  const archivedAt = archivedAtForLeaseEnd(leaseEnd);

  // Stammdaten fields
  const name      = body.name      !== undefined ? body.name.trim()      : tenant.name;
  const email     = body.email     !== undefined ? body.email.trim()      : tenant.email;
  const phone     = body.phone     !== undefined ? body.phone.trim()      : tenant.phone;
  const apartment = body.apartment !== undefined ? body.apartment.trim()  : tenant.apartment;

  if (body.name !== undefined && name.length < 2) {
    return NextResponse.json({ error: "Name muss mindestens 2 Zeichen lang sein." }, { status: 400 });
  }
  if (body.email !== undefined && !email.includes("@")) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
  }

  await db.tenant.update({
    where: { id },
    data: { leaseStart, leaseEnd, archivedAt, name, email, phone, apartment }
  });

  // Keep User.name in sync if name changed
  if (body.name !== undefined && tenant.name !== name) {
    await db.user.updateMany({
      where: { tenantId: id },
      data: { name }
    });
  }

  return NextResponse.json({ ok: true });
}

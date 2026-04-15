// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { parseOptionalDateInput, parseLeaseEndDateInput, archivedAtForLeaseEnd } from "@/lib/tenant-lease";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/mieter/import-pdf
// Body: FormData with field "pdf" (PDF file) and optional "confirm=true"
export async function POST(req: NextRequest) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const orgId = user.orgId ?? null;

  const formData = await req.formData();
  const file = formData.get("pdf") as File | null;
  const confirm = formData.get("confirm") === "true";
  const passwordOverride = formData.get("password") as string | null;
  const propertyIdOverride = formData.get("propertyId") as string | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Bitte eine PDF-Datei hochladen." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF zu gross (max. 10 MB)." }, { status: 400 });
  }

  // Convert PDF to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // Ask Claude to extract tenant data from the contract
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: `Extrahiere aus diesem Mietvertrag die folgenden Angaben und gib sie als JSON zurück.
Antworte NUR mit einem JSON-Objekt, kein weiterer Text.

{
  "name": "Vollständiger Name des Mieters",
  "email": "E-Mail-Adresse des Mieters (oder null wenn nicht angegeben)",
  "phone": "Telefonnummer (oder null)",
  "apartment": "Wohnungsbezeichnung / Adresse der Mieteinheit",
  "leaseStart": "Mietbeginn im Format TT.MM.JJJJ",
  "leaseEnd": "Mietende im Format TT.MM.JJJJ (oder null wenn unbefristet)",
  "propertyName": "Name oder Adresse der Liegenschaft (oder null)",
  "monthlyRent": "Monatliche Miete in CHF als Zahl (oder null)",
  "deposit": "Kaution in CHF als Zahl (oder null)",
  "notes": "Wichtige Zusatzinformationen in einem Satz (oder null)"
}

Wenn ein Feld nicht im Dokument vorkommt, setze es auf null.
Datumsformat immer TT.MM.JJJJ.`,
          },
        ],
      },
    ],
  });

  // Parse Claude's response
  const rawText = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  let extracted: Record<string, any>;
  try {
    // Extract JSON from response (Claude might add markdown code blocks)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Kein JSON gefunden");
    extracted = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({
      error: "KI konnte keine Daten aus dem PDF lesen. Ist es ein Mietvertrag?",
      raw: rawText,
    }, { status: 422 });
  }

  // If just preview (not confirm), return extracted data for user to review
  if (!confirm) {
    // Try to match propertyName to existing property
    let matchedProperty: { id: string; name: string } | null = null;
    if (extracted.propertyName && orgId) {
      const props = await db.property.findMany({
        where: { orgId },
        select: { id: true, name: true },
      });
      const needle = extracted.propertyName.toLowerCase();
      const match = props.find(p => p.name.toLowerCase().includes(needle) || needle.includes(p.name.toLowerCase()));
      if (match) matchedProperty = match;
    }

    // Check if tenant already exists in this apartment/property
    const existingTenant = await db.tenant.findFirst({
      where: {
        archivedAt: null,
        apartment: { contains: extracted.apartment?.split("/")[0]?.trim() ?? "", mode: "insensitive" },
        ...(orgId ? { orgId } : {}),
      },
      select: { id: true, name: true, leaseEnd: true },
    });

    return NextResponse.json({
      preview: true,
      extracted,
      matchedProperty,
      existingTenant: existingTenant ? {
        id: existingTenant.id,
        name: existingTenant.name,
        leaseEnd: existingTenant.leaseEnd?.toISOString() ?? null,
      } : null,
    });
  }

  // === CONFIRM: actually create the tenant ===
  const name = extracted.name?.trim();
  const email = extracted.email?.trim().toLowerCase();
  const phone = extracted.phone?.trim() ?? "";
  const apartment = extracted.apartment?.trim();
  const leaseStart = parseOptionalDateInput(extracted.leaseStart);
  const leaseEnd = extracted.leaseEnd ? parseLeaseEndDateInput(extracted.leaseEnd) : null;
  const archivedAt = archivedAtForLeaseEnd(leaseEnd);
  const password = passwordOverride?.trim() || Math.random().toString(36).slice(2, 10); // auto-generate if not set
  const propertyId = propertyIdOverride || null;

  if (!name) return NextResponse.json({ error: "Name nicht erkannt." }, { status: 422 });
  if (!email) return NextResponse.json({ error: "E-Mail nicht erkannt — bitte manuell anlegen." }, { status: 422 });
  if (!leaseStart) return NextResponse.json({ error: "Mietbeginn nicht erkannt." }, { status: 422 });

  // Handle existing tenant in same apartment → set leaseEnd
  const existingTenantId = formData.get("existingTenantId") as string | null;
  const existingLeaseEnd = formData.get("existingLeaseEnd") as string | null;
  if (existingTenantId && existingLeaseEnd) {
    const parsedEnd = parseLeaseEndDateInput(existingLeaseEnd);
    if (parsedEnd) {
      await db.tenant.update({
        where: { id: existingTenantId },
        data: { leaseEnd: parsedEnd, archivedAt: archivedAtForLeaseEnd(parsedEnd) },
      });
    }
  }

  // Check email not already in use in this org
  const emailExists = await db.tenant.findFirst({ where: { email, orgId, archivedAt: null } });
  if (emailExists) {
    return NextResponse.json({ error: `E-Mail ${email} ist bereits bei einem aktiven Mieter vergeben.` }, { status: 409 });
  }

  const userEmail = orgId ? `${email}__${orgId}` : email;

  const tenant = await db.$transaction(async (tx) => {
    const t = await (tx.tenant as any).create({
      data: { name, email, phone, apartment: apartment ?? "Unbekannt", leaseStart, leaseEnd, archivedAt, orgId, propertyId },
    });
    await tx.user.create({
      data: { email: userEmail, password, name, role: UserRole.MIETER, tenantId: t.id },
    });
    return t;
  });

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    name,
    email,
    password,
    message: `Mieter "${name}" erfolgreich angelegt.`,
  });
}

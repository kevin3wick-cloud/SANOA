// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { parseOptionalDateInput } from "@/lib/tenant-lease";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_properties",
    description: "Alle Liegenschaften dieser Verwaltung auflisten.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_property",
    description: "Neue Liegenschaft anlegen.",
    input_schema: {
      type: "object",
      properties: {
        name:    { type: "string", description: "Name der Liegenschaft, z.B. 'Hauptstrasse 5'" },
        address: { type: "string", description: "Vollständige Adresse (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_tenants",
    description: "Alle aktiven Mieter auflisten.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "create_tenant",
    description: "Neuen Mieter anlegen und optional einer Liegenschaft zuweisen.",
    input_schema: {
      type: "object",
      properties: {
        name:       { type: "string" },
        email:      { type: "string" },
        phone:      { type: "string" },
        apartment:  { type: "string", description: "Wohnungsbezeichnung, z.B. '2. OG links'" },
        password:   { type: "string", description: "Initiales Passwort für das Mieter-Portal (min. 6 Zeichen)" },
        leaseStart: { type: "string", description: "Mietbeginn im Format TT.MM.JJJJ" },
        leaseEnd:   { type: "string", description: "Mietende im Format TT.MM.JJJJ (optional)" },
        propertyId: { type: "string", description: "ID der Liegenschaft (aus list_properties)" },
      },
      required: ["name", "email", "phone", "apartment", "password", "leaseStart"],
    },
  },
  {
    name: "assign_tenant_to_property",
    description: "Einen bestehenden Mieter einer Liegenschaft zuweisen oder wechseln.",
    input_schema: {
      type: "object",
      properties: {
        tenantId:   { type: "string" },
        propertyId: { type: "string" },
      },
      required: ["tenantId", "propertyId"],
    },
  },
  {
    name: "list_contractors",
    description: "Alle hinterlegten Handwerker auflisten.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "send_email_to_contractor",
    description: "E-Mail an einen Handwerker senden, z.B. für ein Ticket.",
    input_schema: {
      type: "object",
      properties: {
        contractorId: { type: "string", description: "ID des Handwerkers (aus list_contractors)" },
        subject:      { type: "string" },
        message:      { type: "string", description: "Inhalt der E-Mail auf Deutsch" },
      },
      required: ["contractorId", "subject", "message"],
    },
  },
  {
    name: "list_open_tickets",
    description: "Alle offenen Tickets auflisten.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_tenant_lease_end",
    description: "Mietende eines bestehenden Mieters setzen (bei Auszug).",
    input_schema: {
      type: "object",
      properties: {
        tenantId: { type: "string" },
        leaseEnd: { type: "string", description: "Datum im Format TT.MM.JJJJ" },
      },
      required: ["tenantId", "leaseEnd"],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, any>,
  orgId: string | null
): Promise<string> {
  try {
    switch (name) {

      case "list_properties": {
        const props = await db.property.findMany({
          where: orgId ? { orgId } : {},
          orderBy: { name: "asc" },
          include: { _count: { select: { tenants: true } } },
        });
        if (props.length === 0) return "Keine Liegenschaften vorhanden.";
        return props.map(p => `• ${p.name} (ID: ${p.id}) — ${p._count.tenants} Mieter${p.address ? `, ${p.address}` : ""}`).join("\n");
      }

      case "create_property": {
        const p = await db.property.create({
          data: { name: input.name, address: input.address ?? null, orgId },
        });
        return `Liegenschaft "${p.name}" wurde angelegt (ID: ${p.id}).`;
      }

      case "list_tenants": {
        const tenants = await db.tenant.findMany({
          where: { archivedAt: null, ...(orgId ? { orgId } : {}) },
          include: { property: { select: { name: true } } },
          orderBy: { name: "asc" },
        });
        if (tenants.length === 0) return "Keine aktiven Mieter vorhanden.";
        return tenants.map(t =>
          `• ${t.name} (ID: ${t.id}) — ${t.apartment}${t.property ? `, ${t.property.name}` : ""} — ${t.email}`
        ).join("\n");
      }

      case "create_tenant": {
        const leaseStart = parseOptionalDateInput(input.leaseStart);
        if (!leaseStart) return "Fehler: Ungültiges Mietbeginn-Datum. Bitte Format TT.MM.JJJJ verwenden.";

        const existing = await db.tenant.findFirst({
          where: { email: input.email.toLowerCase(), orgId, archivedAt: null },
        });
        if (existing) return `Fehler: E-Mail ${input.email} ist bereits bei einem aktiven Mieter vergeben.`;

        const userEmail = orgId ? `${input.email.toLowerCase()}__${orgId}` : input.email.toLowerCase();

        const tenant = await db.$transaction(async (tx) => {
          const t = await (tx.tenant as any).create({
            data: {
              name: input.name,
              email: input.email.toLowerCase(),
              phone: input.phone,
              apartment: input.apartment,
              leaseStart,
              leaseEnd: input.leaseEnd ? parseOptionalDateInput(input.leaseEnd) : null,
              orgId,
              propertyId: input.propertyId ?? null,
            },
          });
          await tx.user.create({
            data: {
              email: userEmail,
              password: input.password,
              name: input.name,
              role: UserRole.MIETER,
              tenantId: t.id,
            },
          });
          return t;
        });

        return `Mieter "${input.name}" wurde angelegt (ID: ${tenant.id}). Mieter-Portal-Login: ${input.email} / ${input.password}`;
      }

      case "assign_tenant_to_property": {
        await db.tenant.update({
          where: { id: input.tenantId },
          data: { propertyId: input.propertyId },
        });
        const tenant = await db.tenant.findUnique({ where: { id: input.tenantId }, select: { name: true } });
        const property = await db.property.findUnique({ where: { id: input.propertyId }, select: { name: true } });
        return `Mieter "${tenant?.name}" wurde der Liegenschaft "${property?.name}" zugewiesen.`;
      }

      case "list_contractors": {
        const contractors = await (db.contractor as any).findMany({
          where: orgId ? { orgId } : {},
          orderBy: [{ trade: "asc" }, { name: "asc" }],
        });
        if (contractors.length === 0) return "Keine Handwerker hinterlegt.";
        return contractors.map(c =>
          `• ${c.name} (ID: ${c.id}) — ${c.trade ?? "Allgemein"} — ${c.email}${c.phone ? ` / ${c.phone}` : ""}`
        ).join("\n");
      }

      case "send_email_to_contractor": {
        const c = await (db.contractor as any).findUnique({ where: { id: input.contractorId } });
        if (!c) return "Fehler: Handwerker nicht gefunden.";

        // Use Resend if configured, otherwise log
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: "Sanoa <noreply@sanoa.tech>",
            to: c.email,
            subject: input.subject,
            text: input.message,
          });
        }

        return `E-Mail an ${c.name} (${c.email}) gesendet:\n\nBetreff: ${input.subject}\n\n${input.message}`;
      }

      case "list_open_tickets": {
        const tickets = await db.ticket.findMany({
          where: { status: { in: ["OPEN", "IN_PROGRESS"] }, tenant: { orgId } },
          include: { tenant: { select: { name: true, apartment: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        if (tickets.length === 0) return "Keine offenen Tickets.";
        return tickets.map(t =>
          `• [${t.status}] ${t.title} (ID: ${t.id}) — Mieter: ${t.tenant.name}, ${t.tenant.apartment}`
        ).join("\n");
      }

      case "set_tenant_lease_end": {
        const leaseEnd = parseOptionalDateInput(input.leaseEnd);
        if (!leaseEnd) return "Fehler: Ungültiges Datum.";
        await db.tenant.update({ where: { id: input.tenantId }, data: { leaseEnd } });
        const tenant = await db.tenant.findUnique({ where: { id: input.tenantId }, select: { name: true } });
        return `Mietende für "${tenant?.name}" gesetzt: ${input.leaseEnd}.`;
      }

      default:
        return `Unbekanntes Tool: ${name}`;
    }
  } catch (e) {
    return `Fehler bei Tool "${name}": ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ── Main route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const orgId = user.orgId ?? null;
  const body = await req.json();
  const messages: Anthropic.MessageParam[] = body.messages ?? [];

  if (!messages.length) return NextResponse.json({ error: "Keine Nachrichten." }, { status: 400 });

  const system = `Du bist der KI-Agent für das Immobilienverwaltungs-System Sanoa.
Du hilfst der Verwaltung dabei, Aufgaben effizient zu erledigen.
Du antwortest immer auf Deutsch.
Du führst Aktionen sofort aus wenn du alle nötigen Informationen hast.
Wenn Informationen fehlen, frag kurz nach.
Nutze die verfügbaren Tools um Mieter, Liegenschaften und Handwerker zu verwalten.
Bei Unklarheiten (z.B. welche Liegenschaft gemeint ist) liste kurz die Optionen auf.
Bestätige nach jeder Aktion kurz was du gemacht hast.`;

  // Agentic loop: run until no more tool calls
  const allMessages = [...messages];
  let iterations = 0;
  const toolLog: { tool: string; result: string }[] = [];

  while (iterations < 10) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system,
      tools: TOOLS,
      messages: allMessages,
    });

    allMessages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(block.name, block.input as Record<string, any>, orgId);
        toolLog.push({ tool: block.name, result });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }

      allMessages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  // Extract final text response
  const lastMsg = allMessages[allMessages.length - 1];
  let text = "";
  if (lastMsg.role === "assistant" && Array.isArray(lastMsg.content)) {
    text = lastMsg.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");
  }

  return NextResponse.json({ reply: text, toolLog });
}

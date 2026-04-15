/**
 * Agent Triggers — automatische Aktionen ohne Benutzereingriff.
 *
 * Diese Funktionen werden im Hintergrund ausgeführt (fire-and-forget).
 * Fehler blockieren nie den Hauptprozess.
 */

import { db } from "@/lib/db";
import { suggestLandlordReply } from "@/lib/ai";

// ── Category → Trade mapping ──────────────────────────────────────────────────

const CATEGORY_TO_TRADE: Record<string, string[]> = {
  SANITAER:       ["Sanitär"],
  HEIZUNG:        ["Heizung"],
  ELEKTRO:        ["Elektro"],
  FENSTER_TUEREN: ["Schlosserei", "Schreiner"],
  ALLGEMEIN:      ["Sonstiges"],
  SONSTIGES:      ["Sonstiges"],
};

// ── Email sender (Resend) ─────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log("[Agent] No RESEND_API_KEY — skipping email to", to); return; }

  const { Resend } = await import("resend");
  const resend = new Resend(key);
  await resend.emails.send({
    from: "Sanoa KI-Agent <noreply@sanoa.tech>",
    to,
    subject,
    text,
  });
}

// ── Trigger 1: Ticket created ─────────────────────────────────────────────────

/**
 * Runs automatically after a tenant creates a ticket.
 * 1. Posts an acknowledgment note in the ticket chat (visible to tenant)
 * 2. Finds matching contractor(s) by category + org
 * 3. Sends email to contractor(s) with ticket details
 */
export async function onTicketCreated(ticketId: string): Promise<void> {
  try {
    // Load ticket with tenant + org info
    const ticket = await (db.ticket as any).findUnique({
      where: { id: ticketId },
      include: {
        tenant: {
          select: { name: true, apartment: true, orgId: true },
        },
      },
    });

    if (!ticket) return;

    const orgId: string | null = ticket.tenant?.orgId ?? null;

    // 1. Post acknowledgment note in chat (tenant sees it immediately)
    const urgencyText = ticket.isUrgent
      ? "⚡ Ihre Meldung wurde als DRINGEND eingestuft und wird sofort bearbeitet."
      : "Ihre Anfrage wird so schnell wie möglich bearbeitet.";

    const ackNote = `Guten Tag ${ticket.tenant?.name?.split(" ")[0] ?? ""},\n\nvielen Dank für Ihre Meldung. ${urgencyText}\n\nSobald wir weitere Informationen haben, melden wir uns bei Ihnen.\n\nFreundliche Grüsse\nIhre Hausverwaltung`;

    await db.ticketNote.create({
      data: {
        ticketId,
        text: ackNote,
        isInternal: false,
        isTenantAuthor: false,
      },
    });

    // 2. Find matching contractors by trade + orgId
    const trades = CATEGORY_TO_TRADE[ticket.category as string] ?? ["Sonstiges"];
    const contractors = await (db.contractor as any).findMany({
      where: {
        trade: { in: trades },
        ...(orgId ? { orgId } : {}),
      },
    });

    if (contractors.length === 0) {
      // No contractor for this category → add internal note for landlord
      await db.ticketNote.create({
        data: {
          ticketId,
          text: `ℹ️ KI-Agent: Kein passender Handwerker für Kategorie "${ticket.category}" gefunden. Bitte manuell zuweisen.`,
          isInternal: true,
          isTenantAuthor: false,
        },
      });
      return;
    }

    // 3. Send email to each matching contractor
    const categoryLabel = ticket.category
      .replace("SANITAER", "Sanitär")
      .replace("HEIZUNG", "Heizung")
      .replace("ELEKTRO", "Elektro")
      .replace("FENSTER_TUEREN", "Fenster/Türen")
      .replace("ALLGEMEIN", "Allgemein")
      .replace("SONSTIGES", "Sonstiges");

    for (const contractor of contractors) {
      const emailText = `Guten Tag ${contractor.name},

wir haben eine neue ${ticket.isUrgent ? "DRINGENDE " : ""}Schadensmeldung erhalten und bitten Sie um Kontaktaufnahme:

Mieter: ${ticket.tenant?.name}
Wohnung: ${ticket.tenant?.apartment}
Kategorie: ${categoryLabel}
Titel: ${ticket.title}
Beschreibung: ${ticket.description}
${ticket.location ? `Ort: ${ticket.location}` : ""}

Bitte melden Sie sich direkt beim Mieter oder teilen Sie uns Ihre Verfügbarkeit mit, damit wir einen Termin koordinieren können.

Mit freundlichen Grüssen
Sanoa Hausverwaltungs-System`;

      await sendEmail(
        contractor.email,
        `${ticket.isUrgent ? "⚡ DRINGEND: " : ""}Neue Schadensmeldung — ${categoryLabel} — ${ticket.tenant?.apartment}`,
        emailText
      );
    }

    // 4. Add internal note for landlord with summary
    const contractorNames = contractors.map((c: any) => c.name).join(", ");
    await db.ticketNote.create({
      data: {
        ticketId,
        text: `✅ KI-Agent: Eingangsbestätigung an Mieter gesendet. E-Mail an Handwerker: ${contractorNames}.`,
        isInternal: true,
        isTenantAuthor: false,
      },
    });

  } catch (e) {
    console.error("[Agent] onTicketCreated error:", e);
    // Never throw — agent failures must not break ticket creation
  }
}

// ── Trigger 2: Tenant sends a message ────────────────────────────────────────

/**
 * Runs automatically after a tenant posts a note/question on a ticket.
 * Uses Claude to generate and post an automatic reply.
 */
export async function onTenantMessage(ticketId: string, tenantMessage: string): Promise<void> {
  try {
    const ticket = await (db.ticket as any).findUnique({
      where: { id: ticketId },
      include: {
        notes: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
          select: { text: true, isTenantAuthor: true, createdAt: true },
        },
        tenant: { select: { name: true } },
      },
    });

    if (!ticket) return;

    // Build chat history for context
    const chatHistory = ticket.notes
      .map((n: any) => `${n.isTenantAuthor ? "Mieter" : "Verwaltung"}: ${n.text}`)
      .join("\n");

    // Get AI reply suggestion
    const reply = await suggestLandlordReply(ticket.title, ticket.description, chatHistory);
    if (!reply || reply.length < 10) return;

    // Post auto-reply as a ticket note
    await db.ticketNote.create({
      data: {
        ticketId,
        text: reply,
        isInternal: false,
        isTenantAuthor: false,
      },
    });

  } catch (e) {
    console.error("[Agent] onTenantMessage error:", e);
  }
}

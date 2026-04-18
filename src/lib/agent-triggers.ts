/**
 * Agent Triggers — automatische Aktionen ohne Benutzereingriff.
 *
 * Diese Funktionen werden im Hintergrund ausgeführt (fire-and-forget).
 * Fehler blockieren nie den Hauptprozess.
 */

import { db } from "@/lib/db";
import { suggestLandlordReply, triageTenantResponsibility } from "@/lib/ai";

// Internal note marker used to track triage state
const TRIAGE_PENDING_MARKER = "[TRIAGE_PENDING]";

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

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  orgId?: string | null,
  ticketReplyTo?: string | null  // e.g. "ticket-abc123@send.sanoa.tech"
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log("[Agent] No RESEND_API_KEY — skipping email to", to); return; }

  // Load org-specific sender name + reply-to
  let senderName = "Sanoa Hausverwaltung";
  let replyTo: string | undefined;
  if (orgId) {
    try {
      const settings = await (db as any).orgSettings.findUnique({ where: { orgId } });
      if (settings?.senderName) senderName = settings.senderName;
      if (settings?.replyToEmail) replyTo = settings.replyToEmail;
    } catch { /* best-effort */ }
  }

  // Ticket-specific reply-to takes priority — routes contractor replies back via Resend inbound
  if (ticketReplyTo) replyTo = ticketReplyTo;

  const { Resend } = await import("resend");
  const resend = new Resend(key);
  await resend.emails.send({
    from: `${senderName} <noreply@sanoa.tech>`,
    to,
    subject,
    text,
    ...(replyTo ? { replyTo } : {}),
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

    // 2. Triage — check if this might be the tenant's responsibility (skip for urgent tickets)
    if (!ticket.isUrgent) {
      const triage = await triageTenantResponsibility(ticket.title, ticket.description, ticket.category);

      if (triage.type === "TENANT") {
        // Clearly tenant's responsibility — inform tenant, don't dispatch contractor
        await db.ticketNote.create({
          data: {
            ticketId,
            text: `ℹ️ ${triage.message}`,
            isInternal: false,
            isTenantAuthor: false,
          },
        });
        await db.ticketNote.create({
          data: {
            ticketId,
            text: `ℹ️ KI-Triage: Mieterverantwortung erkannt — kein Handwerker kontaktiert.`,
            isInternal: true,
            isTenantAuthor: false,
          },
        });
        return;
      }

      if (triage.type === "QUESTION") {
        // Ask tenant first — store pending state as internal note, don't dispatch yet
        await db.ticketNote.create({
          data: {
            ticketId,
            text: triage.question,
            isInternal: false,
            isTenantAuthor: false,
          },
        });
        await db.ticketNote.create({
          data: {
            ticketId,
            text: `${TRIAGE_PENDING_MARKER} Rückfrage gestellt: ${triage.question}`,
            isInternal: true,
            isTenantAuthor: false,
          },
        });
        return; // wait for tenant response before dispatching
      }
      // type === "DISPATCH" → fall through to normal contractor dispatch
    }

    // 3. Find matching contractors by trade + orgId
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
      const emailText = `${greeting(contractor)},

wir haben eine neue ${ticket.isUrgent ? "DRINGENDE " : ""}Schadensmeldung erhalten und bitten Sie um Kontaktaufnahme:

Mieter: ${ticket.tenant?.name}
Wohnung: ${ticket.tenant?.apartment}
Kategorie: ${categoryLabel}
Titel: ${ticket.title}
Beschreibung: ${ticket.description}
${ticket.location ? `Ort: ${ticket.location}` : ""}

Um einen Terminvorschlag direkt einzureichen, klicken Sie bitte auf folgenden Link:
https://app.sanoa.tech/contractor/vorschlag/${ticketId}

Mit freundlichen Grüssen
Ihre Verwaltung`;

      await sendEmail(
        contractor.email,
        `${ticket.isUrgent ? "⚡ DRINGEND: " : ""}Neue Schadensmeldung — ${categoryLabel} — ${ticket.tenant?.apartment} [TKT-${ticketId}]`,
        emailText,
        orgId,
        `ticket-${ticketId}@quautoliod.resend.app`  // Reply routes back via Resend inbound webhook
      );
    }

    // 5. Add internal note for landlord with summary
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
          orderBy: { createdAt: "asc" },
          select: { text: true, isTenantAuthor: true, isInternal: true, createdAt: true },
        },
        tenant: { select: { name: true, orgId: true, apartment: true } },
      },
    });

    if (!ticket) return;

    // Check if there's a pending triage question
    const triagePendingNote = ticket.notes.find(
      (n: any) => n.isInternal && n.text.startsWith(TRIAGE_PENDING_MARKER)
    );

    if (triagePendingNote) {
      // Tenant has answered the triage question — decide whether to dispatch
      const client = await import("@/lib/ai");
      const shouldDispatch = await client.shouldDispatchAfterTriageResponse(
        ticket.title,
        ticket.description,
        ticket.category,
        triagePendingNote.text.replace(TRIAGE_PENDING_MARKER, "").trim(),
        tenantMessage
      );

      if (shouldDispatch.dispatch) {
        // Delete the triage pending note and dispatch contractor
        await db.ticketNote.deleteMany({
          where: { ticketId, text: { startsWith: TRIAGE_PENDING_MARKER } },
        } as any);
        // Trigger contractor dispatch
        void onTicketCreated(ticketId);
        return;
      } else {
        // Still tenant's responsibility or issue resolved
        await db.ticketNote.create({
          data: {
            ticketId,
            text: shouldDispatch.message,
            isInternal: false,
            isTenantAuthor: false,
          },
        });
        await db.ticketNote.deleteMany({
          where: { ticketId, text: { startsWith: TRIAGE_PENDING_MARKER } },
        } as any);
        return;
      }
    }

    // No triage pending — normal auto-reply
    const chatHistory = ticket.notes
      .filter((n: any) => !n.isInternal)
      .map((n: any) => `${n.isTenantAuthor ? "Mieter" : "Verwaltung"}: ${n.text}`)
      .join("\n");

    const reply = await suggestLandlordReply(ticket.title, ticket.description, chatHistory);
    if (!reply || reply.length < 10) return;

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

// ── Helper: find contractors for a ticket ─────────────────────────────────────

async function getContractorsForTicket(ticketId: string): Promise<{ name: string; contactPerson: string | null; email: string }[]> {
  const ticket = await (db.ticket as any).findUnique({
    where: { id: ticketId },
    include: { tenant: { select: { orgId: true } } },
  });
  if (!ticket) return [];
  const trades = CATEGORY_TO_TRADE[ticket.category as string] ?? ["Sonstiges"];
  const orgId = ticket.tenant?.orgId ?? null;
  return (db.contractor as any).findMany({
    where: { trade: { in: trades }, ...(orgId ? { orgId } : {}) },
    select: { name: true, contactPerson: true, email: true },
  });
}

// Returns "Guten Tag [Vorname]" using contactPerson if set, else company name
function greeting(contractor: { name: string; contactPerson: string | null }): string {
  const addressee = contractor.contactPerson?.trim() || contractor.name;
  return `Guten Tag ${addressee}`;
}

// ── Trigger 3: Tenant confirms appointment ────────────────────────────────────

/**
 * Sends a confirmation email to the contractor when the tenant confirms.
 */
export async function onProposalConfirmed(
  ticketId: string,
  proposalMessage: string,
  startAt: Date | null
): Promise<void> {
  try {
    const ticket = await (db.ticket as any).findUnique({
      where: { id: ticketId },
      include: { tenant: { select: { name: true, apartment: true, orgId: true } } },
    });
    if (!ticket) return;

    const orgId: string | null = ticket.tenant?.orgId ?? null;
    const contractors = await getContractorsForTicket(ticketId);
    if (contractors.length === 0) return;

    const dateLabel = startAt
      ? startAt.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const timeLabel = startAt
      ? startAt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })
      : "";

    for (const contractor of contractors) {
      const text = `${greeting(contractor)},

der Mieter hat den Terminvorschlag BESTÄTIGT.

Ticket: ${ticket.title}
Mieter: ${ticket.tenant?.name}
Wohnung: ${ticket.tenant?.apartment}
${dateLabel ? `Bestätigter Termin: ${dateLabel}${timeLabel ? ` um ${timeLabel} Uhr` : ""}` : `Vorschlag: ${proposalMessage}`}

Bitte erscheinen Sie zum vereinbarten Termin.

Mit freundlichen Grüssen
Ihre Verwaltung`;

      await sendEmail(
        contractor.email,
        `✅ Termin bestätigt — ${ticket.title} — ${ticket.tenant?.apartment} [TKT-${ticketId}]`,
        text,
        orgId
      );
    }
  } catch (e) {
    console.error("[Agent] onProposalConfirmed error:", e);
  }
}

// ── Trigger 4: Tenant rejects appointment ─────────────────────────────────────

/**
 * Sends the tenant's availability to the contractor and includes a new proposal link.
 */
export async function onProposalRejected(
  ticketId: string,
  availabilityMessage: string
): Promise<void> {
  try {
    const ticket = await (db.ticket as any).findUnique({
      where: { id: ticketId },
      include: { tenant: { select: { name: true, apartment: true, orgId: true } } },
    });
    if (!ticket) return;

    const orgId: string | null = ticket.tenant?.orgId ?? null;
    const contractors = await getContractorsForTicket(ticketId);
    if (contractors.length === 0) return;

    for (const contractor of contractors) {
      const text = `${greeting(contractor)},

der Mieter hat den Terminvorschlag leider ABGELEHNT.

Ticket: ${ticket.title}
Mieter: ${ticket.tenant?.name}
Wohnung: ${ticket.tenant?.apartment}

Verfügbarkeit des Mieters:
${availabilityMessage}

Bitte reichen Sie einen neuen Terminvorschlag ein:
https://app.sanoa.tech/contractor/vorschlag/${ticketId}

Mit freundlichen Grüssen
Ihre Verwaltung`;

      await sendEmail(
        contractor.email,
        `❌ Termin abgelehnt — bitte neuen Vorschlag — ${ticket.tenant?.apartment} [TKT-${ticketId}]`,
        text,
        orgId
      );
    }
  } catch (e) {
    console.error("[Agent] onProposalRejected error:", e);
  }
}

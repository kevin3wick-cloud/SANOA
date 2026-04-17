/**
 * Inbound Email Webhook (Resend)
 *
 * Resend POSTs here when a contractor replies to a ticket email.
 * The webhook payload contains only metadata (email_id, from, to, subject).
 * We fetch the actual email body via the Resend Received Emails API,
 * extract the ticket ID from the To address (ticket-{id}@send.sanoa.tech)
 * or fall back to the subject line, parse the appointment with Claude,
 * create a TicketAppointmentProposal, and notify the tenant.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractAppointmentFromEmail } from "@/lib/ai";

export const runtime = "nodejs";

// Extract ticket ID from To address: "ticket-abc123@send.sanoa.tech"
function extractTicketIdFromTo(to: string | string[]): string | null {
  const addresses = Array.isArray(to) ? to : [to];
  for (const addr of addresses) {
    const match = addr.match(/ticket-([a-z0-9]+)@/i);
    if (match) return match[1];
  }
  return null;
}

// Extract ticket ID from subject line: "[TKT-abc123]"
function extractTicketIdFromSubject(subject: string): string | null {
  const match = subject.match(/\[TKT-([a-z0-9]+)\]/i);
  return match ? match[1] : null;
}

// Parse "DD.MM.YYYY" and optional "HH:MM" into a Date
function parseDate(dateStr: string, timeStr: string | null): Date | null {
  try {
    const [day, month, year] = dateStr.split(".").map(Number);
    if (!day || !month || !year) return null;
    const [hour, minute] = timeStr ? timeStr.split(":").map(Number) : [10, 0];
    return new Date(year, month - 1, day, hour ?? 10, minute ?? 0);
  } catch {
    return null;
  }
}

// Fetch the actual email body from Resend Received Emails API
async function fetchEmailBody(emailId: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.warn("[Webhook] Resend API returned", res.status, "for email", emailId);
      return null;
    }
    const data = await res.json();
    // Prefer plain text, fall back to HTML
    return data.text ?? data.html ?? null;
  } catch (e) {
    console.error("[Webhook] Failed to fetch email body:", e);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Resend inbound webhook payload format:
    // { type: "email.received", data: { email_id, from, to, subject, ... } }
    // Older / direct-parse fallback: body.subject, body.text, body.from
    const data = body.data ?? body;
    const emailId: string = data.email_id ?? data.id ?? "";
    const subject: string = data.subject ?? body.subject ?? body.headers?.subject ?? "";
    const fromEmail: string = data.from ?? body.from ?? "";
    const toAddress: string | string[] = data.to ?? body.to ?? "";

    if (!subject && !emailId) {
      return NextResponse.json({ ok: true, skipped: "no content" });
    }

    // 1. Determine ticket ID — prefer To address, fall back to subject
    let ticketId = extractTicketIdFromTo(toAddress);
    if (!ticketId) ticketId = extractTicketIdFromSubject(subject);

    if (!ticketId) {
      console.log("[Webhook] No ticket ID found. Subject:", subject, "To:", toAddress);
      return NextResponse.json({ ok: true, skipped: "no ticket id" });
    }

    // 2. Get email body — Resend inbound includes text/html directly in data
    let textContent = data.text ?? data.html ?? body.text ?? body.plain ?? "";
    // Fallback: fetch via Resend API if body wasn't in payload
    if (!textContent && emailId) {
      textContent = (await fetchEmailBody(emailId)) ?? "";
    }

    if (!textContent) {
      console.log("[Webhook] Could not retrieve email body for", emailId);
      return NextResponse.json({ ok: true, skipped: "no email body" });
    }

    // 3. Load ticket + tenant
    const ticket = await (db as any).ticket.findUnique({
      where: { id: ticketId },
      include: {
        tenant: { select: { id: true, name: true, pushSubscriptions: true } },
      },
    });

    if (!ticket) {
      console.log("[Webhook] Ticket not found:", ticketId);
      return NextResponse.json({ ok: true, skipped: "ticket not found" });
    }

    // 4. Save raw contractor message as internal note
    await db.ticketNote.create({
      data: {
        ticketId,
        text: `📧 Handwerker-Antwort (${fromEmail}):\n\n${textContent.slice(0, 1000)}`,
        isInternal: true,
        isTenantAuthor: false,
      },
    });

    // 5. Ask Claude to extract appointment proposal
    const proposal = await extractAppointmentFromEmail(textContent);

    if (!proposal) {
      // No appointment found — add internal note
      await db.ticketNote.create({
        data: {
          ticketId,
          text: `ℹ️ KI-Agent: Handwerker hat geantwortet, aber keinen konkreten Terminvorschlag gemacht. Bitte manuell prüfen.`,
          isInternal: true,
          isTenantAuthor: false,
        },
      });
      return NextResponse.json({ ok: true, skipped: "no appointment found" });
    }

    // 6. Parse date and create TicketAppointmentProposal
    const startAt = parseDate(proposal.date, proposal.time);
    await (db as any).ticketAppointmentProposal.create({
      data: {
        ticketId,
        message: proposal.message,
        startAt,
        status: "PENDING",
      },
    });

    // 7. Send push notification to tenant (best-effort)
    try {
      const subs = ticket.tenant?.pushSubscriptions ?? [];
      if (subs.length > 0) {
        const webpush = await import("web-push");
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          webpush.default.setVapidDetails(
            "mailto:noreply@sanoa.tech",
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );
          for (const sub of subs) {
            await webpush.default.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: "Neuer Terminvorschlag",
                body: `${proposal.date}${proposal.time ? ` um ${proposal.time} Uhr` : ""} — bitte bestätigen`,
              })
            ).catch(() => {});
          }
        }
      }
    } catch { /* push is best-effort */ }

    console.log(`[Webhook] Appointment proposal created for ticket ${ticketId}: ${proposal.date} ${proposal.time}`);
    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("[Webhook] Error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

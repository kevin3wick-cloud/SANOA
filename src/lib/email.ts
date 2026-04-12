/**
 * Minimal email sender via Resend HTTP API.
 * Set RESEND_API_KEY in Railway env vars.
 * Free tier: 100 emails/day, no package needed.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL     = process.env.EMAIL_FROM ?? "Sanoa <noreply@sanoa.tech>";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) return; // not configured → skip silently

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   payload.to,
        subject: payload.subject,
        html: payload.html
      })
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

// ── Template helpers ────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #0f0f0f; color: #e5e5e5; margin: 0; padding: 32px 16px; }
  .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 32px; }
  h2 { margin: 0 0 16px; font-size: 18px; color: #fff; }
  p { margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #ccc; }
  .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #7c6ff7; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
  .footer { margin-top: 24px; font-size: 12px; color: #666; }
</style></head><body>
<div class="card">${content}</div>
</body></html>`;
}

export function newMessageEmail(opts: {
  tenantName: string;
  tenantEmail: string;
  ticketTitle: string;
  messagePreview: string;
  ticketUrl: string;
}) {
  return {
    to: opts.tenantEmail,
    subject: "Neue Nachricht von der Verwaltung",
    html: emailWrapper(`
      <h2>Neue Nachricht</h2>
      <p>Hallo ${opts.tenantName},</p>
      <p>Die Verwaltung hat Ihnen eine Nachricht zu Ihrem Ticket <strong>„${opts.ticketTitle}"</strong> geschrieben:</p>
      <p style="background:#111;border-left:3px solid #7c6ff7;padding:10px 14px;border-radius:4px;font-style:italic;">${opts.messagePreview}</p>
      <a class="btn" href="${opts.ticketUrl}">Nachricht ansehen</a>
      <p class="footer">Sanoa Mieter-Portal – Diese E-Mail wurde automatisch verschickt.</p>
    `)
  };
}

export function newDocumentEmail(opts: {
  tenantName: string;
  tenantEmail: string;
  documentName: string;
  dashboardUrl: string;
}) {
  return {
    to: opts.tenantEmail,
    subject: "Neues Dokument verfügbar",
    html: emailWrapper(`
      <h2>Neues Dokument</h2>
      <p>Hallo ${opts.tenantName},</p>
      <p>Die Verwaltung hat ein neues Dokument für Sie bereitgestellt:</p>
      <p><strong>${opts.documentName}</strong></p>
      <a class="btn" href="${opts.dashboardUrl}">Dokument ansehen</a>
      <p class="footer">Sanoa Mieter-Portal – Diese E-Mail wurde automatisch verschickt.</p>
    `)
  };
}

export function newAppointmentEmail(opts: {
  tenantName: string;
  tenantEmail: string;
  ticketTitle: string;
  message: string;
  ticketUrl: string;
}) {
  return {
    to: opts.tenantEmail,
    subject: "Neuer Terminvorschlag",
    html: emailWrapper(`
      <h2>Neuer Terminvorschlag</h2>
      <p>Hallo ${opts.tenantName},</p>
      <p>Die Verwaltung schlägt einen Termin für Ihr Ticket <strong>„${opts.ticketTitle}"</strong> vor:</p>
      <p style="background:#111;border-left:3px solid #7c6ff7;padding:10px 14px;border-radius:4px;font-style:italic;">${opts.message}</p>
      <a class="btn" href="${opts.ticketUrl}">Termin ansehen & bestätigen</a>
      <p class="footer">Sanoa Mieter-Portal – Diese E-Mail wurde automatisch verschickt.</p>
    `)
  };
}

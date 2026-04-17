import Anthropic from "@anthropic-ai/sdk";

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Detects whether a ticket is urgent based on description + category.
 */
export async function detectUrgency(
  description: string,
  category: string
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: `Du bist Assistent einer Immobilienverwaltung in der Schweiz. Beurteile ob diese Schadensmeldung DRINGEND ist.

DRINGEND = sofortiger Handlungsbedarf, eines dieser Kriterien muss zutreffen:
- Wasser: Rohrbruch, Überschwemmung, unkontrollierter Wasseraustritt, kein Wasser überhaupt
- Gas: Gasgeruch, Gasleck (immer höchste Priorität)
- Strom: Kompletter Stromausfall in der Wohnung, Kurzschluss mit Brandgefahr, blanke Kabel
- Heizung: Totalausfall der Heizung (besonders Oktober–März), kein Warmwasser seit mehr als 1 Tag
- Sicherheit: Einbruch, Tür/Schloss defekt und Wohnung nicht sicherbar, Feuer- oder Rauchschaden
- Gesundheit: Grossflächiger Schimmel (mehr als ca. 30x30cm), starker Schimmelgeruch
- Aufzug: Defekt wenn Mieter auf Rollstuhl oder Gehhilfe angewiesen (erkennbar an Erwähnung)
- Kühlschrank/Gefriergerät: Komplett defekt (Lebensmittelverderb)
- Fenster/Balkontür: Lässt sich nicht schliessen oder sperren (Sicherheitsrisiko)

NICHT dringend (normale Priorität):
- Kosmetische Schäden (Risse, abgeblätterte Farbe, kleine Kratzer)
- Einzelne defekte Steckdose oder Glühbirne
- Leicht tropfender Wasserhahn
- Kleiner Schimmelfleck unter 30x30cm
- Heizung funktioniert, ist aber schwächer als normal
- Allgemeine Reinigung oder Pflege

Kategorie: ${category}
Beschreibung: ${description}

Antworte NUR mit: JA oder NEIN`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim().toUpperCase().startsWith("JA");
  } catch {
    return false;
  }
}

/**
 * Analyzes a ticket photo and returns a short German description of the damage.
 */
export async function analyzeTicketPhoto(
  imageDataUrl: string
): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return "";

  const mimeType = match[1] as
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";
  const base64Data = match[2];

  if (base64Data.length > 5_000_000) return "";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Beschreibe den sichtbaren Schaden auf diesem Bild in 1-2 kurzen deutschen Sätzen. Nur das Sichtbare beschreiben (Ausmaß, betroffene Fläche, Art des Schadens). Keine Empfehlungen.",
            },
          ],
        },
      ],
    });

    return response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";
  } catch {
    return "";
  }
}

/**
 * Suggests what action the landlord should take for this ticket.
 * E.g. "Klempner beauftragen und Terminvorschlag senden."
 */
export async function suggestTicketAction(
  title: string,
  description: string,
  category: string,
  location: string
): Promise<string> {
  const client = getClient();
  if (!client) return "";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `Du bist Assistent einer Schweizer Immobilienverwaltung. Das System erlaubt dem Vermieter Terminvorschläge direkt im System zu senden – der Mieter muss sich nicht extra melden.

Schlage in 1-2 Sätzen vor, was der Vermieter als nächsten Schritt tun soll.

Ticket: ${title}
Kategorie: ${category}
Ort: ${location}
Beschreibung: ${description}

Sei konkret (z.B. Fachmann beauftragen, Schaden begutachten, Terminvorschlag im System senden). Schreibe NUR die Empfehlung ohne Einleitung. Auf Deutsch.`,
        },
      ],
    });

    return response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";
  } catch {
    return "";
  }
}

/**
 * Suggests a short landlord reply for the tenant chat.
 */
export async function suggestLandlordReply(
  ticketTitle: string,
  description: string,
  chatHistory: { text: string; isTenantAuthor: boolean }[]
): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const historyText = chatHistory
    .slice(-6)
    .map((n) => `${n.isTenantAuthor ? "Mieter" : "Vermieter"}: ${n.text}`)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 180,
      messages: [
        {
          role: "user",
          content: `Du bist Assistent eines Schweizer Vermieters. Formuliere eine kurze, professionelle und freundliche Antwort auf das Mieteranliegen.

WICHTIG: Das System hat eine eingebaute Terminvorschlag-Funktion – der Vermieter kann direkt einen Termin im System vorschlagen. Sage dem Mieter NICHT, er solle die Verwaltung kontaktieren. Wenn ein Termin nötig ist, schreibe z.B. "Wir werden Ihnen einen Terminvorschlag über das System zukommen lassen."

Ticket: ${ticketTitle}
Beschreibung: ${description}
${historyText ? `\nBisheriger Chat:\n${historyText}` : ""}

Schreibe NUR die Antwort, keine Erklärung. Auf Deutsch. Max. 2-3 Sätze.`,
        },
      ],
    });

    return response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";
  } catch {
    return "";
  }
}

/**
 * Extracts an appointment proposal from a contractor's reply email.
 * Returns null if no appointment can be found.
 */
export async function extractAppointmentFromEmail(
  emailText: string
): Promise<{ date: string; time: string | null; message: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Du analysierst eine E-Mail-Antwort eines Handwerkers auf eine Schadensmeldung. Extrahiere einen Terminvorschlag falls vorhanden.

E-Mail-Text:
${emailText}

Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text davor/danach):
- Falls ein Termin vorgeschlagen wird: {"hasProposal": true, "date": "DD.MM.YYYY", "time": "HH:MM oder null", "message": "kurze deutsche Zusammenfassung des Vorschlags in 1 Satz"}
- Falls kein konkreter Termin vorgeschlagen wird: {"hasProposal": false}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!json.hasProposal) return null;
    return { date: json.date, time: json.time ?? null, message: json.message };
  } catch {
    return null;
  }
}

import Anthropic from "@anthropic-ai/sdk";

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Detects whether a ticket is urgent based on description + category.
 * Returns false if AI is unavailable (no API key or error).
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
          content: `Du bist Assistent einer Immobilienverwaltung. Beurteile ob diese Schadensmeldung DRINGEND ist.

Dringend = sofortiger Handlungsbedarf: Wasserrohrbruch, Gasgeruch, Stromausfall, Heizungsausfall im Winter, Feuer, Sicherheitsrisiko, überschwemmte Räume.

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
 * Returns empty string if AI is unavailable or image is too large.
 */
export async function analyzeTicketPhoto(
  imageDataUrl: string
): Promise<string> {
  const client = getClient();
  if (!client) return "";

  // Parse data URL: data:<mimeType>;base64,<data>
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return "";

  const mimeType = match[1] as
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";
  const base64Data = match[2];

  // Anthropic image limit is ~5MB base64. Skip if too large.
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
 * Suggests a short landlord reply based on ticket context and chat history.
 */
export async function suggestLandlordReply(
  ticketTitle: string,
  description: string,
  chatHistory: { text: string; isTenantAuthor: boolean }[]
): Promise<string> {
  const client = getClient();
  if (!client) return "";

  const historyText = chatHistory
    .slice(-6) // last 6 messages for context
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

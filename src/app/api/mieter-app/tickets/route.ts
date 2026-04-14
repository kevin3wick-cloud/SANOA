import { TicketCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { formatCategory } from "@/lib/format";
import { hasUnreadFromLandlordForTenant } from "@/lib/ticket-chat-read";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { db } from "@/lib/db";
import { detectUrgency, analyzeTicketPhoto } from "@/lib/ai";
import { isTicketCategory } from "@/mieter-app/options";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB before base64 encoding

function isImageBuffer(buf: Buffer) {
  if (buf.length < 4) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return true;
  }
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return true;
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  return false;
}

export async function GET() {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rows = await db.ticket.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      notes: {
        where: { isInternal: false },
        select: { createdAt: true, isTenantAuthor: true }
      },
      appointmentProposals: {
        select: { status: true, createdAt: true, respondedAt: true }
      }
    }
  });

  const payload = rows.map((row) => {
    const { notes, appointmentProposals, ...rest } = row;
    const publicNotes = notes.map((n) => ({
      createdAt: n.createdAt,
      isInternal: false as const,
      isTenantAuthor: n.isTenantAuthor
    }));
    const unreadFromLandlord = hasUnreadFromLandlordForTenant(
      {
        createdAt: row.createdAt,
        tenantLastSeenChatAt: row.tenantLastSeenChatAt,
        tenantLastSeenAppointmentsAt: row.tenantLastSeenAppointmentsAt,
        notes: publicNotes
      },
      appointmentProposals
    );
    return { ...rest, unreadFromLandlord };
  });

  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Formulardaten." }, { status: 400 });
  }

  const categoryRaw = formData.get("category");
  const locationRaw = formData.get("location");
  const descriptionRaw = formData.get("description");

  const category =
    typeof categoryRaw === "string" ? categoryRaw.trim() : "";
  const location =
    typeof locationRaw === "string" ? locationRaw.trim() : "";

  if (!isTicketCategory(category)) {
    return NextResponse.json({ error: "Bitte eine Kategorie wählen." }, { status: 400 });
  }
  if (!location) {
    return NextResponse.json({ error: "Bitte einen Ort wählen." }, { status: 400 });
  }

  const description =
    typeof descriptionRaw === "string" ? descriptionRaw.trim() : "";
  if (description.length < 3) {
    return NextResponse.json(
      { error: "Bitte eine Kurzbeschreibung mit mindestens 3 Zeichen eingeben." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Bitte ein Foto des Schadens hochladen (Pflichtfeld)." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Das Bild ist zu groß (max. 8 MB)." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isImageBuffer(buffer)) {
    return NextResponse.json(
      { error: "Bitte ein Bild (JPEG, PNG, WebP oder GIF) hochladen." },
      { status: 400 }
    );
  }

  const mimeType =
    file.type === "image/png"
      ? "image/png"
      : file.type === "image/webp"
        ? "image/webp"
        : file.type === "image/gif"
          ? "image/gif"
          : "image/jpeg";
  const imageUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const cat = category as TicketCategory;
  const title = `${formatCategory(cat)} – ${location}`;

  // Auto-assign: find property assignee for this tenant's property
  let autoAssignedToId: string | null = null;
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { propertyId: true },
    });
    if (tenant?.propertyId) {
      const assignee = await db.propertyAssignee.findFirst({
        where: { propertyId: tenant.propertyId },
        orderBy: { createdAt: "asc" }, // pick first assignee if multiple
      });
      if (assignee) autoAssignedToId = assignee.userId;
    }
  } catch { /* auto-assign is best-effort */ }

  const ticket = await db.ticket.create({
    data: {
      title,
      description,
      location,
      category: cat,
      isUrgent: false,
      tenantId: user.tenantId,
      imageUrl,
      ...(autoAssignedToId ? { assignedToId: autoAssignedToId } : {}),
    }
  });

  // AI enrichment: run urgency detection + photo analysis in parallel (best-effort)
  try {
    const [isUrgentAI, aiSummary] = await Promise.all([
      detectUrgency(description, cat),
      analyzeTicketPhoto(imageUrl),
    ]);
    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        isUrgent: isUrgentAI,
        aiSummary: aiSummary || null,
      },
    });
  } catch {
    // AI enrichment failure must never block ticket creation
  }

  return NextResponse.json({ id: ticket.id }, { status: 201 });
}

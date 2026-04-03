import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type NoteBody = {
  text?: string;
  isInternal?: boolean;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as NoteBody;

  if (!body.text || body.text.trim().length < 2) {
    return NextResponse.json(
      { error: "Text für Notiz zu kurz" },
      { status: 400 }
    );
  }

  await db.ticketNote.create({
    data: {
      ticketId: id,
      text: body.text.trim(),
      isInternal: body.isInternal ?? true
    }
  });

  return NextResponse.json({ ok: true });
}

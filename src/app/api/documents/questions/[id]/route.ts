// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";

// PATCH — landlord answers a question
export async function PATCH(req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const answer = body.answer?.trim();

  if (!answer || answer.length < 1) {
    return NextResponse.json({ error: "Antwort darf nicht leer sein." }, { status: 400 });
  }

  const updated = await db.documentQuestion.update({
    where: { id },
    data: { answer, answeredAt: new Date() },
  });

  return NextResponse.json(updated);
}

// DELETE — dismiss/delete a question
export async function DELETE(_req: NextRequest, { params }) {
  const user = await getLandlordSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { id } = await params;
  await db.documentQuestion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

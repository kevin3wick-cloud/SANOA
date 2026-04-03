import { NextRequest, NextResponse } from "next/server";
import { AppointmentProposalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getMieterSessionUser } from "@/lib/tenant-auth";

type Body = {
  decision?: string;
};

export async function POST(
  request: NextRequest,
  {
    params
  }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const user = await getMieterSessionUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id: ticketId, proposalId } = await params;
  const body = (await request.json()) as Body;
  const decision = body.decision?.toLowerCase();

  if (decision !== "confirm" && decision !== "reject") {
    return NextResponse.json(
      { error: "Ungültige Entscheidung (confirm oder reject)." },
      { status: 400 }
    );
  }

  const proposal = await db.ticketAppointmentProposal.findFirst({
    where: {
      id: proposalId,
      ticketId,
      status: AppointmentProposalStatus.PENDING
    },
    include: { ticket: true }
  });

  if (!proposal || proposal.ticket.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Vorschlag nicht gefunden." }, { status: 404 });
  }

  await db.ticketAppointmentProposal.update({
    where: { id: proposalId },
    data: {
      status:
        decision === "confirm"
          ? AppointmentProposalStatus.CONFIRMED
          : AppointmentProposalStatus.REJECTED,
      respondedAt: new Date()
    }
  });

  return NextResponse.json({ ok: true });
}

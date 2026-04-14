export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/app-shell";
import { getLandlordSessionUser } from "@/lib/landlord-auth";
import { db } from "@/lib/db";
import { LiegenschaftenPanel } from "./_components/liegenschaften-panel";

export default async function LiegenschaftenPage() {
  const user = await getLandlordSessionUser();
  if (!user) return null;
  const orgId = (user as any).orgId ?? null;

  // Load properties with assignee user data
  const properties = await (db.property as any).findMany({
    where: orgId ? { orgId } : {},
    orderBy: { name: "asc" },
    include: {
      assignees: true,
      _count: { select: { tenants: true } },
    },
  });

  // Load team members for assignee picker
  const teamMembers = await db.user.findMany({
    where: {
      role: { in: ["LANDLORD", "ADMIN"] },
      ...(orgId ? { orgId } : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Enrich properties with user names
  const enriched = properties.map((p: any) => ({
    ...p,
    assigneeUsers: teamMembers.filter((m: any) =>
      p.assignees.some((a: any) => a.userId === m.id)
    ),
  }));

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="page-title">Liegenschaften</h1>
          <p className="page-lead muted">
            Liegenschaften verwalten und Mitarbeitende zuweisen.
          </p>
        </div>
        <LiegenschaftenPanel
          initialProperties={enriched}
          teamMembers={teamMembers}
        />
      </div>
    </AppShell>
  );
}

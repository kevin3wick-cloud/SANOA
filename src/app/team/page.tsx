export const dynamic = 'force-dynamic';

import { requireOrgAdminSession } from "@/lib/landlord-auth";
import { AppShell } from "@/components/layout/app-shell";
import { TeamPanel } from "./_components/team-panel";

export default async function TeamPage() {
  const user = await requireOrgAdminSession();

  return (
    <AppShell>
      <TeamPanel currentUserId={user.id} />
    </AppShell>
  );
}

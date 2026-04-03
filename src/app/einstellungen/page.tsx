import { AppShell } from "@/components/layout/app-shell";
import { SettingsPanels } from "@/components/ui/settings-panels";
import { db } from "@/lib/db";

export default async function EinstellungenPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="page-title">Einstellungen</h1>
          <p className="page-lead muted">Profil, Benutzer und Benachrichtigungen.</p>
        </div>
        <SettingsPanels users={users} />
      </div>
    </AppShell>
  );
}

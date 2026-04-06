export const dynamic = 'force-dynamic';

import { AppShell } from "@/components/layout/app-shell";
import { SettingsPanels } from "@/components/ui/settings-panels";
import { requireLandlordSession } from "@/lib/landlord-auth";

export default async function EinstellungenPage() {
  const user = await requireLandlordSession();

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="page-title">Einstellungen</h1>
          <p className="page-lead muted">Profil, Benutzer und Benachrichtigungen.</p>
        </div>
        <SettingsPanels
          currentUserRole={user.role}
          currentUserName={user.name}
          currentUserEmail={user.email}
        />
      </div>
    </AppShell>
  );
}

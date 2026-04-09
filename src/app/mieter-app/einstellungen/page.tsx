export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMieterSession } from "@/lib/tenant-auth";
import { MieterNav } from "../_components/mieter-nav";
import { MieterTopBar } from "../_components/mieter-top-bar";
import { MieterSettingsForms } from "./mieter-settings-forms";

export default async function MieterEinstellungenPage() {
  const user = await requireMieterSession();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="content" style={{ maxWidth: 640, paddingBottom: 40 }}>
        <div className="stack dashboard-stack">
          <MieterTopBar />
          <MieterNav />

          <div>
            <Link
              href="/mieter-app/dashboard"
              className="table-link"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, marginBottom: 12 }}
            >
              <ChevronLeft size={14} strokeWidth={2} aria-hidden />
              Zurück
            </Link>
            <h1 className="page-title">Einstellungen</h1>
          </div>

          <MieterSettingsForms
            currentName={user.tenant.name}
            apartment={user.tenant.apartment}
          />
        </div>
      </div>
    </main>
  );
}

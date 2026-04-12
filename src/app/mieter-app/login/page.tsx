export const dynamic = 'force-dynamic';

import { Home } from "lucide-react";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { MieterLoginForm } from "../_components/mieter-login-form";

export default async function MieterLoginPage() {
  const user = await getMieterSessionUser();
  // Do NOT auto-redirect — allow switching accounts by logging in again.
  // The new login will overwrite the existing session cookie.

  return (
    <main className="login-page">
      <div className="card login-card">
        <div className="login-brand">
          <div className="login-brand-icon" aria-hidden>
            <Home size={26} strokeWidth={1.75} />
          </div>
          <div>
            <h1>Sanoa</h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
              Mieter-Portal
            </p>
          </div>
        </div>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>
          Anmelden
        </h2>
        {user?.tenant && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--muted)"
          }}>
            Aktuell angemeldet als <strong>{user.tenant.name}</strong>.{" "}
            <a href="/mieter-app/dashboard" style={{ color: "var(--accent)" }}>
              Zum Dashboard
            </a>{" "}
            oder unten als anderes Konto anmelden.
          </div>
        )}
        <MieterLoginForm />
      </div>
    </main>
  );
}

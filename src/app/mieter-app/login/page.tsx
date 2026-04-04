export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { getMieterSessionUser } from "@/lib/tenant-auth";
import { MieterLoginForm } from "../_components/mieter-login-form";

export default async function MieterLoginPage() {
  const user = await getMieterSessionUser();
  if (user?.tenant) {
    redirect("/mieter-app/dashboard");
  }

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
        <MieterLoginForm />
      </div>
    </main>
  );
}

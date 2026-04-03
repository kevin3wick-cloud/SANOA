import { Building2 } from "lucide-react";
import { LoginForm } from "@/components/ui/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="card login-card">
        <div className="login-brand">
          <div className="login-brand-icon" aria-hidden>
            <Building2 size={26} strokeWidth={1.75} />
          </div>
          <div>
            <h1>Sanoa</h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
              Vermieter-Portal
            </p>
          </div>
        </div>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>
          Anmelden
        </h2>
        <LoginForm />
      </div>
    </main>
  );
}

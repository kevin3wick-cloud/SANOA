"use client";

import { Bell, Building2, LogOut, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";

type TopbarProps = {
  userName: string;
  userEmail: string;
};

export function Topbar({ userName, userEmail }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="topbar">
      <div className="topbar-lead">
        <span className="topbar-icon-wrap" aria-hidden>
          <Building2 size={20} strokeWidth={1.75} />
        </span>
        <div>
          <div className="topbar-title">Vermieter-Portal</div>
          <div className="topbar-sub muted">Strukturierte Mieteranfragen</div>
        </div>
      </div>
      <div className="topbar-actions">
        <ThemeToggle />
        <button type="button" className="icon-button" aria-label="Benachrichtigungen">
          <Bell size={18} strokeWidth={1.75} />
        </button>
        <div className="topbar-user">
          <span className="topbar-user-avatar" aria-hidden>
            <UserRound size={18} strokeWidth={1.75} />
          </span>
          <span className="topbar-user-email muted">{userEmail || userName}</span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Abmelden"
          onClick={handleLogout}
          title="Abmelden"
        >
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

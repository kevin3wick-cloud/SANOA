"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";

export function MieterTopBar() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/mieter-app/logout", { method: "POST" });
    router.push("/mieter-app/login");
    router.refresh();
  }

  return (
    <div className="mieter-top-bar">
      <Link
        href="/mieter-app/einstellungen"
        className="secondary-button mieter-logout-btn"
        title="Einstellungen"
      >
        <Settings size={14} strokeWidth={1.75} aria-hidden />
        Einstellungen
      </Link>
      <button
        type="button"
        className="secondary-button mieter-logout-btn"
        onClick={() => void logout()}
      >
        <LogOut size={14} strokeWidth={1.75} aria-hidden />
        Logout
      </button>
    </div>
  );
}

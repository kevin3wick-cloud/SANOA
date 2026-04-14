"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";

export function MieterTopBar({ unreadCount = 0 }: { unreadCount?: number }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/mieter-app/logout", { method: "POST" });
    router.push("/mieter-app/login");
    router.refresh();
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 0 0",
    }}>
      {/* Logo / brand */}
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text)" }}>
        Sanoa
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Bell with unread badge */}
        <Link href="/mieter-app/tickets" style={{ position: "relative", display: "inline-flex", padding: 8 }}>
          <Bell size={20} strokeWidth={1.75} style={{ color: unreadCount > 0 ? "var(--accent)" : "var(--muted)" }} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4,
              width: 8, height: 8, borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid var(--bg)",
            }} />
          )}
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={() => void logout()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 8, display: "inline-flex", alignItems: "center",
            color: "var(--muted)",
          }}
          title="Abmelden"
        >
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

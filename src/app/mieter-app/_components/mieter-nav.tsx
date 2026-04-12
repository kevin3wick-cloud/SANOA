"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, ListTodo, Plus, Settings } from "lucide-react";

export function MieterNav() {
  const pathname = usePathname();
  const [landlordUnreadCount, setLandlordUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/mieter-app/unread-summary", {
          credentials: "include"
        });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (!cancelled && typeof data.count === "number") {
          setLandlordUnreadCount(data.count);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const linkClass = (active: boolean) =>
    `dashboard-cta dashboard-cta-secondary${active ? " mieter-nav-active" : ""}`;

  const onTicketsBranch = pathname?.startsWith("/mieter-app/tickets") ?? false;

  return (
    <nav aria-label="Mieter-Navigation" style={{ marginBottom: 8 }}>
      {/* Ticket erfassen — prominent full-width */}
      <Link
        href="/mieter-app/tickets/new"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          padding: "13px 16px",
          borderRadius: "var(--radius-sm)",
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
          marginBottom: 10,
          boxShadow: "0 2px 12px color-mix(in srgb, var(--accent) 35%, transparent)",
          opacity: pathname === "/mieter-app/tickets/new" ? 0.85 : 1,
        }}
      >
        <Plus size={19} strokeWidth={2} aria-hidden />
        Ticket erfassen
      </Link>

      {/* Secondary nav row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Link
          href="/mieter-app/dashboard"
          className={linkClass(pathname === "/mieter-app/dashboard")}
          style={{ flexDirection: "column", gap: 4, padding: "10px 8px", fontSize: 12 }}
        >
          <Home size={20} strokeWidth={1.75} aria-hidden />
          Start
        </Link>
        <Link
          href="/mieter-app/tickets"
          className={linkClass(onTicketsBranch && pathname !== "/mieter-app/tickets/new")}
          style={{ flexDirection: "column", gap: 4, padding: "10px 8px", fontSize: 12, position: "relative" }}
        >
          <ListTodo size={20} strokeWidth={1.75} aria-hidden />
          Tickets
          {landlordUnreadCount > 0 ? (
            <span
              className="mieter-nav-unread-count"
              aria-label={`${landlordUnreadCount} ungelesene Nachrichten der Verwaltung`}
            >
              {landlordUnreadCount > 9 ? "9+" : landlordUnreadCount}
            </span>
          ) : null}
        </Link>
        <Link
          href="/mieter-app/einstellungen"
          className={linkClass(pathname === "/mieter-app/einstellungen")}
          style={{ flexDirection: "column", gap: 4, padding: "10px 8px", fontSize: 12 }}
        >
          <Settings size={20} strokeWidth={1.75} aria-hidden />
          Einstellungen
        </Link>
      </div>
    </nav>
  );
}

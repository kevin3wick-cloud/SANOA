"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, Home, ListTodo } from "lucide-react";

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
    <nav
      className="dashboard-quick-actions"
      style={{ marginBottom: 8 }}
      aria-label="Mieter-Navigation"
    >
      <Link
        href="/mieter-app/dashboard"
        className={linkClass(pathname === "/mieter-app/dashboard")}
      >
        <Home size={18} strokeWidth={1.75} aria-hidden />
        Start
      </Link>
      <Link
        href="/mieter-app/tickets"
        className={linkClass(onTicketsBranch && pathname !== "/mieter-app/tickets/new")}
        style={{ position: "relative" }}
      >
        <ListTodo size={18} strokeWidth={1.75} aria-hidden />
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
        href="/mieter-app/tickets/new"
        className={`dashboard-cta dashboard-cta-primary${pathname === "/mieter-app/tickets/new" ? " mieter-nav-active" : ""}`}
      >
        <AlertCircle size={18} strokeWidth={1.75} aria-hidden />
        Schaden melden
      </Link>
    </nav>
  );
}

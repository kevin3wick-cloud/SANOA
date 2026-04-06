"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  BarChart2,
  Building2,
  FileText,
  LayoutDashboard,
  Settings2,
  Ticket,
  Users
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/archiv", label: "Archiv", icon: Archive },
  { href: "/reporting", label: "Auswertung", icon: BarChart2 },
  { href: "/mieter", label: "Mieter", icon: Users },
  { href: "/dokumente", label: "Dokumente", icon: FileText },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings2 }
];

function isNavActive(href: string, pathname: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/mieter") {
    return pathname === "/mieter" || pathname.startsWith("/mieter/");
  }
  if (href === "/tickets") {
    return pathname === "/tickets" || pathname.startsWith("/tickets/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  userRole?: string;
};

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [tenantUnreadCount, setTenantUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/tickets/unread-summary");
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (!cancelled && typeof data.count === "number") {
          setTenantUnreadCount(data.count);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const isAdmin = userRole === "ADMIN";
  const visibleNavItems = isAdmin
    ? navItems.filter((item) => item.href === "/einstellungen")
    : navItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Building2 size={22} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="sidebar-title">Sanoa</h2>
          <p className="sidebar-sub">{isAdmin ? "Admin" : "Vermieter"}</p>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Hauptnavigation">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.href, pathname);
          const showChatDot = item.href === "/tickets" && tenantUnreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "nav-link nav-link-active" : "nav-link"}
              style={showChatDot ? { position: "relative" } : undefined}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              <span>{item.label}</span>
              {showChatDot ? (
                <span
                  className="sidebar-nav-unread-dot"
                  title={`${tenantUnreadCount} Ticket(s) mit neuer Mieter-Nachricht`}
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart2,
  Building2,
  FileText,
  LayoutDashboard,
  Settings2,
  Ticket,
  Users,
  UsersRound
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/reporting", label: "Auswertung", icon: BarChart2 },
  { href: "/mieter", label: "Mieter", icon: Users },
  { href: "/liegenschaften", label: "Liegenschaften", icon: Building2 },
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
  orgRole?: string;
};

export function Sidebar({ userRole, orgRole }: SidebarProps) {
  const pathname = usePathname();
  const [tenantUnreadCount, setTenantUnreadCount] = useState(0);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [docQuestionCount, setDocQuestionCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ticketRes, pendingRes, docQRes] = await Promise.all([
          fetch("/api/tickets/unread-summary"),
          fetch("/api/mieter/pending-count"),
          fetch("/api/documents/questions/unanswered-count"),
        ]);
        if (!cancelled) {
          if (ticketRes.ok) {
            const d = (await ticketRes.json()) as { count?: number };
            if (typeof d.count === "number") setTenantUnreadCount(d.count);
          }
          if (pendingRes.ok) {
            const d = (await pendingRes.json()) as { count?: number };
            if (typeof d.count === "number") setPendingRequestCount(d.count);
          }
          if (docQRes.ok) {
            const d = (await docQRes.json()) as { count?: number };
            if (typeof d.count === "number") setDocQuestionCount(d.count);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  const isAdmin = userRole === "ADMIN";
  const isOrgAdmin = orgRole === "ORG_ADMIN";

  const visibleNavItems = isAdmin
    ? navItems.filter((item) => item.href === "/einstellungen")
    : [
        ...navItems,
        ...(isOrgAdmin ? [{ href: "/team", label: "Team", icon: UsersRound }] : []),
      ];

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
          const showChatDot    = item.href === "/tickets"    && tenantUnreadCount > 0;
          const showPendingDot = item.href === "/mieter"     && pendingRequestCount > 0;
          const showDocDot     = item.href === "/dokumente"  && docQuestionCount > 0;
          const showDot = showChatDot || showPendingDot || showDocDot;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "nav-link nav-link-active" : "nav-link"}
              style={showDot ? { position: "relative" } : undefined}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              <span>{item.label}</span>
              {showChatDot && (
                <span
                  className="sidebar-nav-unread-dot"
                  title={`${tenantUnreadCount} Ticket(s) mit neuer Mieter-Nachricht`}
                  aria-hidden
                />
              )}
              {showPendingDot && (
                <span
                  className="sidebar-nav-unread-dot"
                  title={`${pendingRequestCount} offene Namensänderungs-Anfrage(n)`}
                  aria-hidden
                />
              )}
              {showDocDot && (
                <span
                  className="sidebar-nav-unread-dot"
                  title={`${docQuestionCount} offene Dokumenten-Frage(n)`}
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getLandlordSessionUser } from "@/lib/landlord-auth";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getLandlordSessionUser();

  return (
    <div className="app-shell">
      <Sidebar />
      <main>
        <Topbar userName={user?.name ?? ""} userEmail={user?.email ?? ""} />
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export const dynamic = 'force-dynamic';

import { requireAdminSession } from "@/lib/landlord-auth";
import { AdminVermieterPanel } from "./_components/admin-vermieter-panel";

export default async function AdminPage() {
  const user = await requireAdminSession();

  return <AdminVermieterPanel currentUserId={user.id} />;
}

export const dynamic = 'force-dynamic';

import { SanoaLoginLayout } from "@/components/ui/sanoa-login-layout";
import { MieterLoginClient } from "./_components/mieter-login-client";

export default function MieterLoginPage() {
  return (
    <SanoaLoginLayout portal="Mieter-Portal">
      <MieterLoginClient />
    </SanoaLoginLayout>
  );
}

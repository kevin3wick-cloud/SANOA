export const dynamic = 'force-dynamic';

import { SanoaLoginLayout } from "@/components/ui/sanoa-login-layout";
import { LandlordLoginClient } from "./_components/landlord-login-client";

export default function LoginPage() {
  return (
    <SanoaLoginLayout portal="Vermieter-Portal">
      <LandlordLoginClient />
    </SanoaLoginLayout>
  );
}

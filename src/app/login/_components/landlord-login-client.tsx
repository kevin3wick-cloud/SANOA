"use client";

import { useRouter } from "next/navigation";
import { SanoaLoginForm } from "@/components/ui/sanoa-login-form";

export function LandlordLoginClient() {
  const router = useRouter();

  function onSuccess(data: Record<string, unknown>) {
    const user = data.user as { role?: string } | undefined;
    const destination = user?.role === "ADMIN" ? "/admin" : "/dashboard";
    router.push(destination);
    router.refresh();
  }

  return <SanoaLoginForm apiPath="/api/auth/login" onSuccess={onSuccess} />;
}

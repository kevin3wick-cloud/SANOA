"use client";

import { useRouter } from "next/navigation";
import { SanoaLoginForm } from "@/components/ui/sanoa-login-form";

export function MieterLoginClient() {
  const router = useRouter();

  function onSuccess(_data: Record<string, unknown>) {
    router.push("/mieter-app/dashboard");
    router.refresh();
  }

  return <SanoaLoginForm apiPath="/api/mieter-app/login" onSuccess={onSuccess} />;
}

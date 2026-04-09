"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible component – calls router.refresh() every 60 seconds so the
 * server-side reporting data stays up to date without a manual page reload.
 */
export function ReportingRefresher({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}

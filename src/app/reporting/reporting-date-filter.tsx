"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function ReportingDateFilter({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: "from" | "to", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clear = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasFilter = Boolean(from || to);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--muted)", flexShrink: 0 }}>
        Zeitraum:
      </span>
      <input
        type="date"
        value={from}
        onChange={(e) => update("from", e.target.value)}
        aria-label="Von"
        style={{
          padding: "5px 10px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "inherit",
          fontSize: 13,
          cursor: "pointer",
        }}
      />
      <span style={{ fontSize: 13, color: "var(--muted)" }}>–</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => update("to", e.target.value)}
        aria-label="Bis"
        style={{
          padding: "5px 10px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "inherit",
          fontSize: 13,
          cursor: "pointer",
        }}
      />
      {hasFilter && (
        <button
          onClick={clear}
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: 12,
            cursor: "pointer",
            width: "auto",
          }}
        >
          Zurücksetzen
        </button>
      )}
    </div>
  );
}

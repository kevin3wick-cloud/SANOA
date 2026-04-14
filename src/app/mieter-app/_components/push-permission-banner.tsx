"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
}

export function PushPermissionBanner() {
  const [status, setStatus] = useState<"unknown" | "prompt" | "granted" | "denied" | "unsupported" | "ios-hint">("unknown");
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // iOS: push only works as installed PWA
    if (isIOS()) {
      if (isInStandaloneMode()) {
        // Installed as PWA → check normal permission
        if (!("Notification" in window) || !("PushManager" in window)) {
          setStatus("unsupported");
        } else {
          setStatus(Notification.permission as any);
          navigator.serviceWorker.register("/sw.js").catch(() => {});
        }
      } else {
        // Not installed → show iOS install hint
        setStatus("ios-hint");
      }
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as any);

    // Register service worker silently
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as any);
      if (permission !== "granted") return;

      // Get VAPID public key
      const res = await fetch("/api/mieter-app/push-subscription");
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const json = sub.toJSON();
      await fetch("/api/mieter-app/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth
        })
      });
    } catch (e) {
      console.error("Push subscribe error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/mieter-app/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
      setStatus("prompt");
    } finally {
      setLoading(false);
    }
  }

  if (status === "unknown" || dismissed) return null;
  if (status === "unsupported") return null;

  // iOS: not installed as PWA yet
  if (status === "ios-hint") {
    return (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 16px",
        background: "color-mix(in srgb, var(--accent) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
        borderRadius: 10, fontSize: 14,
      }}>
        <Bell size={18} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <strong style={{ display: "block", marginBottom: 4 }}>Benachrichtigungen aktivieren</strong>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Tippe auf <strong>Teilen</strong> (□↑) und dann <strong>„Zum Home-Bildschirm"</strong> — danach kannst du Benachrichtigungen aktivieren.
          </span>
        </div>
        <button onClick={() => setDismissed(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}>
          <X size={16} />
        </button>
      </div>
    );
  }

  if (status === "granted") {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontSize: 13,
        color: "var(--muted)"
      }}>
        <Bell size={15} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Benachrichtigungen aktiv</span>
        <button
          onClick={disable}
          disabled={loading}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, fontSize: 12 }}
        >
          {loading ? "…" : "Deaktivieren"}
        </button>
      </div>
    );
  }

  if (status === "denied") {
    return null; // Browser blocked it, can't do anything programmatically
  }

  // status === "prompt" → ask user
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "14px 16px",
      background: "color-mix(in srgb, var(--accent) 10%, transparent)",
      border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
      borderRadius: 10,
      fontSize: 14
    }}>
      <Bell size={18} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <strong style={{ display: "block", marginBottom: 4 }}>Benachrichtigungen aktivieren</strong>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          Erhalte eine Benachrichtigung wenn der Vermieter dir schreibt, ein Dokument hochlädt oder einen Termin vorschlägt.
        </span>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={enable}
            disabled={loading}
            style={{ fontSize: 13, padding: "7px 16px", width: "auto" }}
          >
            {loading ? "Wird aktiviert …" : "Aktivieren"}
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              fontSize: 13,
              padding: "7px 16px",
              width: "auto",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted)"
            }}
          >
            Nicht jetzt
          </button>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Helper: convert base64url to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

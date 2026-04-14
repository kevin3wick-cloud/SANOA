import type { ReactNode } from "react";

/**
 * Full-screen login layout matching the sanoa.tech landing page aesthetic:
 * dark navy background, SANOA wordmark, decorative circles, glassmorphism card.
 */
export function SanoaLoginLayout({
  portal,
  children,
}: {
  portal: "Vermieter-Portal" | "Mieter-Portal";
  children: ReactNode;
}) {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#080c1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      position: "relative",
      overflow: "hidden",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* Decorative circles — match landing page */}
      <div style={{
        position: "absolute", top: "-120px", right: "-100px",
        width: 420, height: 420, borderRadius: "50%",
        border: "1.5px solid rgba(100, 120, 220, 0.18)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "-60px", right: "60px",
        width: 260, height: 260, borderRadius: "50%",
        border: "1px solid rgba(100, 120, 220, 0.12)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-80px", left: "-60px",
        width: 320, height: 320, borderRadius: "50%",
        border: "1px solid rgba(100, 120, 220, 0.10)",
        pointerEvents: "none",
      }} />

      {/* Subtle dot pattern via radial gradient */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(rgba(100,120,220,0.15) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
        pointerEvents: "none",
        opacity: 0.5,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: "#7b8ff5",
            textTransform: "uppercase",
          }}>
            SANOA
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: "32px 28px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}>
          {/* Portal label */}
          <p style={{
            margin: "0 0 6px",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#7b8ff5",
          }}>
            {portal}
          </p>
          <h1 style={{
            margin: "0 0 28px",
            fontSize: 22,
            fontWeight: 600,
            color: "#ffffff",
            letterSpacing: "-0.01em",
          }}>
            Anmelden
          </h1>

          {children}
        </div>

        {/* Back link */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
          <a
            href="https://sanoa.tech"
            style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", letterSpacing: "0.04em" }}
          >
            sanoa.tech
          </a>
        </p>
      </div>
    </main>
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#080c1a",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          fontSize: 110,
          fontWeight: 700,
          color: "#7b8ff5",
          letterSpacing: "-0.02em",
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}

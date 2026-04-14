import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#080c1a",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          fontSize: 20,
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

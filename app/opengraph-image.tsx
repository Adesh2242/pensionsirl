import { ImageResponse } from "next/og";

export const alt = "PensionIQ — compare Irish pension funds and estimate your retirement pot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when the site is shared (and by Twitter/X via the same tags). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #050505 0%, #0d2524 55%, #409b96 140%)",
          color: "#f3f1ea",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#409b96",
              color: "#050505",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 40,
            }}
          >
            P
          </div>
          pensioniq
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -2, maxWidth: 980 }}>
            compare irish pension funds.
          </div>
          <div style={{ fontSize: 32, color: "#b9b6ad", maxWidth: 980 }}>
            returns, charges and risk from 10 providers · pension calculator · track your portfolio
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";

import { SITE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE.name} — ${SITE.tagline}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0b1220 0%, #0f172a 55%, #123047 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* Sail mark */}
          <svg width="120" height="120" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#0f172a" stroke="#1e3a5f" strokeWidth="2" />
            <path d="M35.5 8c9.4 10 16.6 22.2 19 34.6H35.5V8Z" fill="#38bdf8" />
            <path d="M28.5 18.5c-7.2 6.6-13 15-15.2 24.1h15.2V18.5Z" fill="#7dd3fc" />
            <path d="M8.5 47.5h47l-6 8.9a4 4 0 0 1-3.3 1.8H17.8a4 4 0 0 1-3.3-1.8l-6-8.9Z" fill="#e2e8f0" />
          </svg>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>{SITE.name}</div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            color: "#cbd5e1",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {SITE.tagline}
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 14,
            fontSize: 24,
            color: "#7dd3fc",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "8px 22px",
              borderRadius: 999,
              border: "1px solid #1e3a5f",
              background: "#0b1a2b",
            }}
          >
            Kanban pipeline
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 22px",
              borderRadius: 999,
              border: "1px solid #1e3a5f",
              background: "#0b1a2b",
            }}
          >
            Weighted forecasting
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 22px",
              borderRadius: 999,
              border: "1px solid #1e3a5f",
              background: "#0b1a2b",
            }}
          >
            Open source
          </div>
        </div>
      </div>
    ),
    size,
  );
}

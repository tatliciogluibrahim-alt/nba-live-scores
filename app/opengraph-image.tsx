import { ImageResponse } from "next/og";

// Dynamic OG image for the landing page.
//
// Next 13+ resolves this file at build/runtime and serves a PNG at
// /opengraph-image. The image is rendered server-side from JSX using
// the next/og Satori pipeline.
//
// Brand-aligned: cream chassis, ink type, mono ticker, BrandMark glyph
// in the corner. No imagery, no logos — same Stadium Panel aesthetic
// as the app.
//
// 1200x630 is the Twitter / LinkedIn / Facebook standard.

export const runtime = "edge";
export const alt = "No Noise Scores — the calm sports companion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#f1ead8",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top row: BrandMark + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* BrandMark glyph — dark chip + cream pill + rust pip */}
          <svg width="64" height="64" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="5.5" fill="#1a1612" />
            <rect
              x="3.5"
              y="8"
              width="17"
              height="8"
              rx="1.8"
              fill="#f1ead8"
            />
            <circle cx="18.5" cy="10" r="1.2" fill="#b85a2a" />
          </svg>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#1a1612",
              letterSpacing: "-0.01em",
            }}
          >
            No Noise Scores
          </div>
        </div>

        {/* Headline + subhead */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#1a1612",
              letterSpacing: "-0.02em",
              lineHeight: 1.02,
              maxWidth: 1000,
            }}
          >
            The calm sports companion.
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#6b6147",
              letterSpacing: "-0.005em",
              lineHeight: 1.25,
              maxWidth: 900,
            }}
          >
            Follow what matters. Skip the rest.
          </div>
        </div>

        {/* Bottom row: moments ticker + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#e55b2a",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            NBA · FIFA World Cup 2026 · NFL coming
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#6b6147",
              letterSpacing: "0.06em",
              fontFamily: "monospace",
            }}
          >
            nonoisescores.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

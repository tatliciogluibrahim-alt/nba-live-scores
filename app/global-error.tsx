"use client";

import { useEffect } from "react";

// Global error boundary — fires when an error escapes the ROOT layout
// itself (provider boot, shell render, etc). Next.js replaces the
// entire <html>/<body> with this component, which is why we render our
// own document structure. This is the last line of defense against a
// blank cream void — without it, an uncaught root error left the body
// empty and the user saw nothing.
//
// Kept fully self-contained: literal colors only (no CSS variables —
// the stylesheet may have failed to load when this fires), no provider
// imports, no atoms. Plain reload action.

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[global-error] root error", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#f1ead8",
          color: "#2b2520",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#7a715d",
              margin: 0,
            }}
          >
            Quick pause
          </p>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              margin: "12px 0 0",
            }}
          >
            Something didn&apos;t load.
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.4,
              color: "#7a715d",
              fontWeight: 500,
              margin: "8px 0 0",
            }}
          >
            Tap to reload No Noise.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            style={{
              marginTop: 24,
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 999,
              border: 0,
              background: "#2b2520",
              color: "#f1ead8",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}

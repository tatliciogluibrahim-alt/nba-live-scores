"use client";

import { forwardRef, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Eyebrow } from "../atoms/Eyebrow";
import { resolveFollowIdentity } from "../follow/identity";
import type { Follow } from "../state/types";

// Sports Circle share card. Generates a 720×720 cream-and-ink image of
// the user's follows — the public-commitment retention play (Phase
// 21C). Unlike the Quiet Wrap card this carries no scores or outcomes,
// so it's safe to share regardless of No-Spoilers.
//
// Mirrors QuietWrapShareModal's structure: inline preview scaled down,
// html-to-image (already a dependency) captures the hidden full-size
// canvas as a PNG. Inline styles only — Tailwind utilities serialize
// unreliably through html-to-image.

type CircleRow = { key: string; name: string; kindLabel: string; accent: string };

// Map the identity's CSS-var accent to a literal hex. The share card
// renders through html-to-image, which serializes CSS custom properties
// unreliably — everything on the canvas must be a literal value.
const ACCENT_HEX: Record<string, string> = {
  "var(--nba)": "#e55b2a",
  "var(--wc)": "#1e6b3c",
  "var(--nfl)": "#1f3a6b",
};

function toRows(follows: Follow[]): CircleRow[] {
  return follows.map((f) => {
    const identity = resolveFollowIdentity(f);
    return {
      key: `${f.kind}-${f.id}`,
      name: identity.name,
      kindLabel: identity.kindLabel,
      accent: ACCENT_HEX[identity.accent] ?? "#6b6147",
    };
  });
}

export function SportsCircleShareModal({
  follows,
  onClose,
}: {
  follows: Follow[];
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = toRows(follows);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    setError(null);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#f1ead8",
      });
      const link = document.createElement("a");
      link.download = "no-noise-sports-circle.png";
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Couldn't generate the image. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share your sports circle"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
      style={{ background: "rgba(26, 22, 18, 0.45)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-t-[18px] sm:rounded-[18px]"
        style={{
          background: "var(--cream)",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        }}
      >
        <div className="flex justify-center pb-1 pt-2 sm:hidden">
          <div
            aria-hidden
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--mute-2)" }}
          />
        </div>

        <div className="px-4 pb-4 pt-3">
          <Eyebrow>Share</Eyebrow>
          <h2
            className="mt-1 text-[20px]"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            Your sports circle
          </h2>
          <p
            className="mt-1 text-[13px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            A clean card of what you follow. No scores, so it&apos;s safe
            to post anytime.
          </p>

          {/* Inline preview at 300×300 — scales to 1440×1440 via pixelRatio 2 */}
          <div className="mt-4 flex justify-center">
            <div
              style={{
                width: 300,
                height: 300,
                overflow: "hidden",
                borderRadius: 18,
                boxShadow: "0 8px 24px rgba(26, 22, 18, 0.12)",
              }}
            >
              <div
                style={{
                  transform: "scale(0.4167)",
                  transformOrigin: "top left",
                  width: 720,
                  height: 720,
                }}
              >
                <CircleCardCanvas ref={cardRef} rows={rows} />
              </div>
            </div>
          </div>

          {error ? (
            <p
              className="mt-3 text-center text-[12px]"
              style={{ color: "var(--critical)", fontWeight: 500 }}
            >
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
                opacity: downloading ? 0.6 : 1,
              }}
            >
              {downloading ? "Generating…" : "Save image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Share card canvas — 720×720 exportable surface ─────────────────────

const CircleCardCanvas = forwardRef<HTMLDivElement, { rows: CircleRow[] }>(
  function CircleCardCanvasInner({ rows }, ref) {
    const shown = rows.slice(0, 6);
    const overflow = rows.length - shown.length;
    return (
      <div
        ref={ref}
        style={{
          width: 720,
          height: 720,
          background: "#f1ead8",
          color: "#1a1612",
          padding: 56,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Header — the current dark-chip BrandMark (ink square + cream
            scoreboard pill + rust pip), inlined at 44px so it matches
            exactly what the user sees in the app header. The old
            broadcast-scorebug variant read as a different logo. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="44" height="44" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="5.5" fill="#1a1612" />
            <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill="#f1ead8" />
            <circle cx="18.5" cy="10" r="1.2" fill="#b85a2a" />
          </svg>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "-0.028em",
              color: "#1a1612",
            }}
          >
            No Noise Scores
          </span>
        </div>

        {/* Editorial title — bigger, more contrast (CD note #5). The
            headline owns the top third and ties to the brand: "No
            noise" is the product name made personal. */}
        <div style={{ marginTop: 60 }}>
          <p
            style={{
              fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6b6147",
              margin: 0,
            }}
          >
            My sports circle
          </p>
          <h1
            style={{
              fontFamily: "'Archivo Black', system-ui, sans-serif",
              fontSize: 64,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              margin: "10px 0 0",
              color: "#1a1612",
            }}
          >
            My circle.
            <br />
            No noise.
          </h1>
        </div>

        {/* Follows list — premium typographic rows. A small sport-coded
            accent dot replaces emoji (orange NBA / green WC), name in
            display weight, kind label in mono. */}
        <div style={{ marginTop: 40, flex: 1 }}>
          {shown.length === 0 ? (
            <p style={{ fontSize: 18, fontWeight: 500, color: "#6b6147", margin: 0 }}>
              Nothing followed yet. A calm slate.
            </p>
          ) : (
            shown.map((row, idx) => (
              <div
                key={row.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 0",
                  borderBottom:
                    idx < shown.length - 1
                      ? "1px solid rgba(26, 22, 18, 0.14)"
                      : "none",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: row.accent,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#1a1612",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {row.name}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6b6147",
                  }}
                >
                  {row.kindLabel}
                </span>
              </div>
            ))
          )}
          {overflow > 0 ? (
            <p style={{ fontSize: 16, fontWeight: 600, color: "#6b6147", margin: "14px 0 0" }}>
              + {overflow} more
            </p>
          ) : null}
        </div>

        {/* Footer — the URL is the CTA (ASO: people retype what they
            remember, so it leads), the tagline closes. */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 20,
            borderTop: "1px solid rgba(26, 22, 18, 0.14)",
          }}
        >
          <span
            style={{
              fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#1a1612",
            }}
          >
            nonoisescores.app
          </span>
          <span
            style={{
              fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6b6147",
            }}
          >
            Follow what matters
          </span>
        </div>
      </div>
    );
  }
);

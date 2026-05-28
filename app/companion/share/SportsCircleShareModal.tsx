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

type CircleRow = { key: string; name: string; kindLabel: string };

function toRows(follows: Follow[]): CircleRow[] {
  return follows.map((f) => {
    const identity = resolveFollowIdentity(f);
    return {
      key: `${f.kind}-${f.id}`,
      name: identity.name,
      kindLabel: identity.kindLabel,
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
            Who you follow. No scores, safe to share. Save the image.
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
        {/* Header — Stadium Panel mark + wordmark (matches Quiet Wrap card) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="40" height="40" viewBox="0 0 100 100">
            <rect x="14" y="20" width="72" height="28" rx="5.5" fill="#1a1612" />
            <circle cx="78" cy="26" r="2.8" fill="#b85a2a" />
            <rect x="14" y="56" width="20" height="22" rx="4" stroke="#1a1612" strokeWidth="2.4" fill="none" opacity="0.3" />
            <rect x="40" y="56" width="20" height="22" rx="4" stroke="#1a1612" strokeWidth="2.4" fill="none" opacity="0.3" />
            <rect x="66" y="56" width="20" height="22" rx="4" stroke="#1a1612" strokeWidth="2.4" fill="none" opacity="0.3" />
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

        {/* Editorial title */}
        <div style={{ marginTop: 56 }}>
          <p
            style={{
              fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.14em",
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
              fontSize: 52,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              margin: "8px 0 0",
              color: "#1a1612",
            }}
          >
            What I follow.
            <br />
            Nothing else.
          </h1>
        </div>

        {/* Follows list */}
        <div style={{ marginTop: 36, flex: 1 }}>
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
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom:
                    idx < shown.length - 1
                      ? "1px solid rgba(26, 22, 18, 0.14)"
                      : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1a1612",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {row.name}
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
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
            <p style={{ fontSize: 16, fontWeight: 600, color: "#6b6147", margin: "12px 0 0" }}>
              + {overflow} more
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 20,
            borderTop: "1px solid rgba(26, 22, 18, 0.14)",
          }}
        >
          <span
            style={{
              fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6b6147",
            }}
          >
            nonoisescores.app
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6b6147" }}>
            Follow what matters.
          </span>
        </div>
      </div>
    );
  }
);

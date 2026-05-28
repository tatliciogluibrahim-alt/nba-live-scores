"use client";

import { forwardRef, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Eyebrow } from "../atoms/Eyebrow";
import type { QuietWrapItem } from "../today/today-data";

// Quiet Wrap share card. Generates a 720×720 cream-and-ink image of
// the user's recent finals — calm, screenshot-worthy, brand-coded.
//
// Under No-Spoilers we disable the share trigger entirely (the point is
// sharing results, but No-Spoilers users explicitly don't want them out).
// The caller is responsible for gating the trigger button.
//
// Uses html-to-image (already in dependencies) to capture the inline
// preview as a PNG. No new deps.

export function QuietWrapShareModal({
  items,
  onClose,
}: {
  items: QuietWrapItem[];
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      link.download = "no-noise-quiet-wrap.png";
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Couldn't generate the image. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  const dayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share your Quiet Wrap"
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
        {/* Sheet handle (mobile drag affordance) */}
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
            Quiet Wrap
          </h2>
          <p
            className="mt-1 text-[13px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Your recent finals. Save the image and share anywhere.
          </p>

          {/* Inline preview at 300×300 — scales to 1440×1440 PNG via pixelRatio 2 */}
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
                <ShareCardCanvas
                  ref={cardRef}
                  items={items}
                  dayLabel={dayLabel}
                />
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

// ── Share card canvas — the actual exportable 720×720 surface ──────────
// Built with inline styles only — html-to-image captures inline styles
// reliably across browsers. Tailwind utilities can be hit-or-miss in the
// canvas serialization, so we hard-code values here.

type ShareCardProps = { items: QuietWrapItem[]; dayLabel: string };

const ShareCardCanvas = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCardCanvasInner({ items, dayLabel }, ref) {
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
        {/* Header — Stadium Panel mark + wordmark.
            Uses the full broadcast-scorebug glyph (top module + three
            hollow stat tiles) because the share card is 720×720 and has
            room for the canonical mark. Inline SVG so html-to-image
            captures cleanly. Hex values inline (no CSS vars) so the
            export renders consistently. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Current dark-chip BrandMark, inlined to match the app header
              (the old broadcast-scorebug variant read as a different
              logo on a shared image). */}
          <svg width="40" height="40" viewBox="0 0 24 24">
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

        {/* Editorial title */}
        <div style={{ marginTop: 64 }}>
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
            Quiet Wrap · {dayLabel}
          </p>
          <h1
            style={{
              fontFamily: "'Archivo Black', system-ui, sans-serif",
              fontSize: 56,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              margin: "8px 0 0",
              color: "#1a1612",
            }}
          >
            My week
            <br />
            in sports.
          </h1>
          <p
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "#6b6147",
              margin: "16px 0 0",
              lineHeight: 1.4,
            }}
          >
            Quiet. Complete. No noise.
          </p>
        </div>

        {/* Finals list */}
        <div style={{ marginTop: 40, flex: 1 }}>
          {items.length === 0 ? (
            <p
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "#6b6147",
                margin: 0,
              }}
            >
              No games finished yet. Calm is a feature.
            </p>
          ) : (
            items.slice(0, 4).map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  borderBottom:
                    idx < Math.min(items.length, 4) - 1
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
                  {item.matchup}
                </span>
                <span
                  style={{
                    fontFamily:
                      "ui-monospace, 'JetBrains Mono', monospace",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1a1612",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.scoreLine}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
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
            The calm sports app.
          </span>
        </div>
      </div>
    );
  }
);

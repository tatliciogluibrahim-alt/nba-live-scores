// /dev/brand-preview — side-by-side BrandMark variants for the
// "more cream, less black" iteration. Not linked from anywhere.
// Reachable directly at /dev/brand-preview.
//
// Each variant renders at three sizes (24, 64, 180) against both a
// cream and a dark surface, plus on a sample header lockup that
// mimics the actual app header context. After picking one, we swap
// the chosen colors into app/companion/frame/BrandMark.tsx and
// public/favicon.svg.

export const metadata = {
  robots: { index: false, follow: false },
  title: "Brand preview | No Noise Scores",
};

type Variant = {
  id: string;
  label: string;
  notes: string;
  /** Render the SVG given a size. Lets each variant own its own
   *  geometry tweaks (border width, scoreboard sizing). */
  render: (size: number) => React.ReactNode;
};

// ── Color palette ────────────────────────────────────────────────────
const INK_DARK = "#1a1612";
const INK_WARM = "#3f342a";       // softer, warm brown-ink
const CREAM_LIGHT = "#f1ead8";
const CREAM_LIGHTER = "#faf4e3";  // even paler cream for chip backgrounds
const LIVE_RUST = "#b85a2a";

// ── Variants ─────────────────────────────────────────────────────────

const variants: Variant[] = [
  {
    id: "current",
    label: "Current — dark chip",
    notes:
      "Today's mark. Dark ink chip dominates the 24×24 area. Cream " +
      "scoreboard pill in the middle. The 'too much black' baseline.",
    render: (s) => (
      <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-hidden>
        <rect width="24" height="24" rx="5.5" fill={INK_DARK} />
        <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill={CREAM_LIGHT} />
        <circle cx="18.5" cy="10" r="1.2" fill={LIVE_RUST} />
      </svg>
    ),
  },
  {
    id: "a-inverted",
    label: "A — Full inversion",
    notes:
      "Cream chip with a thin ink outline so it doesn't disappear " +
      "against the cream chassis. Dark ink scoreboard pill. Rust pip. " +
      "Same proportions, inverted colors. Most cream-forward option.",
    render: (s) => (
      <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-hidden>
        <rect
          width="24"
          height="24"
          rx="5.5"
          fill={CREAM_LIGHT}
          stroke={INK_DARK}
          strokeWidth="1.25"
        />
        <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill={INK_DARK} />
        <circle cx="18.5" cy="10" r="1.2" fill={LIVE_RUST} />
      </svg>
    ),
  },
  {
    id: "b-warm-gray",
    label: "B — Warm gray chip",
    notes:
      "Same pattern as today, but the chip uses a warmer, less-black " +
      "brown ink. Less harsh against cream. Subtle change — keeps the " +
      "current silhouette feel.",
    render: (s) => (
      <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-hidden>
        <rect width="24" height="24" rx="5.5" fill={INK_WARM} />
        <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill={CREAM_LIGHT} />
        <circle cx="18.5" cy="10" r="1.2" fill={LIVE_RUST} />
      </svg>
    ),
  },
  {
    id: "c-light-cream",
    label: "C — Light cream chip, ink scoreboard",
    notes:
      "Even lighter cream chip background with a hairline warm-gray " +
      "outline. Dark scoreboard pill stays as the focal element. Rust " +
      "pip. Cream-dominant but the scoreboard still reads strongly.",
    render: (s) => (
      <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-hidden>
        <rect
          width="24"
          height="24"
          rx="5.5"
          fill={CREAM_LIGHTER}
          stroke={INK_WARM}
          strokeWidth="1"
        />
        <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill={INK_DARK} />
        <circle cx="18.5" cy="10" r="1.2" fill={LIVE_RUST} />
      </svg>
    ),
  },
  {
    id: "d-no-chip",
    label: "D — No chip, just the scoreboard",
    notes:
      "Drop the chip entirely. The scoreboard pill IS the mark, sitting " +
      "directly on the chassis. Maximum minimalism. Risk: weaker in the " +
      "PWA app-icon context where iOS expects a chip-shape that fills " +
      "the icon square.",
    render: (s) => (
      <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-hidden>
        <rect x="0" y="6" width="24" height="12" rx="2.5" fill={INK_DARK} />
        <circle cx="20" cy="9" r="1.4" fill={LIVE_RUST} />
      </svg>
    ),
  },
];

// ── Component ────────────────────────────────────────────────────────

export default function BrandPreviewPage() {
  return (
    <main
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        minHeight: "100vh",
        padding: "32px 24px",
        fontFamily: "var(--font-body)",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        BrandMark variants.
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--mute-1)",
          marginBottom: 32,
          maxWidth: 560,
        }}
      >
        &quot;More cream, less black.&quot; Each variant rendered at
        three sizes against both light and dark surfaces, plus inside
        a sample header lockup. Pick one and I&apos;ll apply it to
        BrandMark.tsx + favicon.svg.
      </p>

      {variants.map((v) => (
        <section
          key={v.id}
          style={{
            marginBottom: 40,
            paddingBottom: 32,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {v.label}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--mute-1)",
              marginBottom: 18,
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            {v.notes}
          </p>

          {/* Light surface row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "20px 24px",
              background: "var(--cream)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--mute-1)",
                textTransform: "uppercase",
                minWidth: 90,
              }}
            >
              On cream
            </span>
            {[24, 32, 64, 180].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {v.render(s)}
                <span style={{ fontSize: 11, color: "var(--mute-1)" }}>{s}px</span>
              </div>
            ))}
          </div>

          {/* Dark surface row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "20px 24px",
              background: "#1a1612",
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "#cdb88c",
                textTransform: "uppercase",
                minWidth: 90,
              }}
            >
              On dark
            </span>
            {[24, 32, 64, 180].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {v.render(s)}
                <span style={{ fontSize: 11, color: "#cdb88c" }}>{s}px</span>
              </div>
            ))}
          </div>

          {/* Header lockup row — mimics the actual app header context */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 20px",
              background: "var(--cream)",
              border: "1px solid var(--line)",
              borderRadius: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--mute-1)",
                textTransform: "uppercase",
                minWidth: 90,
              }}
            >
              In header
            </span>
            {v.render(24)}
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
              }}
            >
              No Noise Scores
            </span>
          </div>
        </section>
      ))}

      <div
        style={{
          marginTop: 40,
          padding: 24,
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: 12,
        }}
      >
        <p style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600, marginBottom: 6 }}>
          Pick one.
        </p>
        <p style={{ fontSize: 13, color: "var(--mute-1)", lineHeight: 1.5 }}>
          Tell me the variant id (current / a-inverted / b-warm-gray /
          c-light-cream / d-no-chip) and I&apos;ll swap it into
          BrandMark.tsx + favicon.svg. The PNG icon family
          (app-icon-*.png, apple-touch-icon.png) will need regenerating
          from the new SVG outside the codebase — I&apos;ll flag that
          so you don&apos;t forget.
        </p>
      </div>
    </main>
  );
}

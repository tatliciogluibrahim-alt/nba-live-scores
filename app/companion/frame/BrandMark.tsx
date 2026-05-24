// Brand mark — v2 (Stage 14F).
//
// Two stacked score rows + a small NBA-accent pip. Scaled up from 22→24px
// with thicker rows and a slightly more prominent pip so the symbol reads
// at small sizes. Calm, sports-coded without being a lettermark or mascot.
// Inline SVG; reversible by reverting BrandBar to a text-only chip.

export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      role="img"
    >
      {/* Ink chip background */}
      <rect width="24" height="24" rx="7" fill="var(--ink)" />

      {/* Two horizontal score rows — abstracted scoreboard lines.
          Row 1 is longer + brighter; row 2 is shorter + dimmer so they
          read like two team-scores stacked, not just lines. */}
      <rect
        x="5"
        y="8"
        width="11"
        height="2.5"
        rx="1.25"
        fill="var(--cream)"
      />
      <rect
        x="5"
        y="13.5"
        width="8"
        height="2.5"
        rx="1.25"
        fill="var(--cream)"
        opacity="0.6"
      />

      {/* Status pip — NBA accent dot in the upper-right. Bumped to r=2
          for legibility at favicon scale. */}
      <circle cx="18.5" cy="9" r="2" fill="var(--nba)" />
    </svg>
  );
}

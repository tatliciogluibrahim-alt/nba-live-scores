// Experimental brand mark (Stage 14E).
//
// Two stacked score rows + a small live pip — abstract scoreboard motif.
// Calm, sports-coded without being a lettermark, mascot, ball, or flame.
// Inline SVG; easy to revert by re-rendering the old "nn" text in BrandBar.
//
// Sized to fit the existing 22–24px brand chip slot.

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden
      role="img"
    >
      {/* Ink chip background */}
      <rect width="22" height="22" rx="6" fill="var(--ink)" />

      {/* Two horizontal score rows — abstracted scoreboard lines */}
      <rect x="4" y="7" width="11" height="2" rx="1" fill="var(--cream)" />
      <rect
        x="4"
        y="12"
        width="8"
        height="2"
        rx="1"
        fill="var(--cream)"
        opacity="0.7"
      />

      {/* Status pip — NBA accent dot in the upper-right */}
      <circle cx="17" cy="8" r="1.5" fill="var(--nba)" />
    </svg>
  );
}

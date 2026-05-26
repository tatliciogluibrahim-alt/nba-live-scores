// Brand mark — Stadium Panel (favicon variant inside an ink chip).
//
// At header sizes (24–32px), we render the simplified favicon glyph
// (single scoreboard module + live-state pip). The full broadcast-scorebug
// mark with three hollow stat tiles below is reserved for larger contexts
// — app icon, splash, og-image, share card.
//
// IMPORTANT: the mark uses *literal* colors, not theme tokens, so it
// reads identically in light and dark mode. Brand identity should not
// invert with the chassis — that creates the "lighter border" effect
// the user reported on dark mode (where `var(--ink)` flips to cream).
// The mark is always: dark ink chip + cream scoreboard pill + rust pip.

const INK_DARK = "#1a1612";
const CREAM_LIGHT = "#f1ead8";
const LIVE_RUST = "#b85a2a";

export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      role="img"
    >
      {/* Ink rounded square — matches the app icon container so the
          mark reads consistently across the header chip and the
          home-screen icon. Constant color (not a token) so dark mode
          doesn't invert the identity. */}
      <rect width="24" height="24" rx="5.5" fill={INK_DARK} />

      {/* Scoreboard module — wider, cream-on-ink horizontal pill. */}
      <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill={CREAM_LIGHT} />

      {/* Live-state pip — upper-right of the module, rust orange. */}
      <circle cx="18.5" cy="10" r="1.2" fill={LIVE_RUST} />
    </svg>
  );
}

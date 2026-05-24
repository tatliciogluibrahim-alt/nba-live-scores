// Brand mark — Stadium Panel (favicon variant inside an ink chip).
//
// At header sizes (24–32px), we render the simplified favicon glyph
// (single scoreboard module + live-state pip). The full broadcast-scorebug
// mark with three hollow stat tiles below is reserved for larger contexts
// — app icon, splash, og-image, share card.
//
// Designed to scale to favicon resolution without collapsing to noise.

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
          home-screen icon. */}
      <rect width="24" height="24" rx="5.5" fill="var(--ink)" />

      {/* Scoreboard module — wider, cream-on-ink horizontal pill */}
      <rect x="3.5" y="8" width="17" height="8" rx="1.8" fill="var(--cream)" />

      {/* Live-state pip — upper-right of the module, --live token
          (rust orange, exclusive to "right now" signals). */}
      <circle cx="18.5" cy="10" r="1.2" fill="var(--live)" />
    </svg>
  );
}

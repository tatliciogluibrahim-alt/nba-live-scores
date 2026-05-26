import type { CSSProperties, ReactNode } from "react";

// Small-caps mono micro-label. 11px, weight 700, letter-spacing 0.12em,
// color --mute-1 by default. Section headers, card eyebrows, group labels.
//
// Phase 8 polish: bumped weight 600 → 700. With JetBrains Mono now
// driving --font-mono (replacing SF Mono in the Phase 7 typography
// upgrade), the 600 weight read thin at 11px caps. 700 restores the
// editorial micro-label intent without going chunky.

export function Eyebrow({
  children,
  color = "var(--mute-1)",
  className,
  style,
}: {
  children: ReactNode;
  /** Token-friendly color string. Pass accent colors when relevant. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`inline-block uppercase ${className ?? ""}`}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

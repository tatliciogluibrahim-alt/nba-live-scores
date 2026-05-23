import type { CSSProperties, ReactNode } from "react";

// Small-caps mono micro-label. 11px, weight 600, letter-spacing 0.10em+,
// color --mute-1 by default. Section headers, card eyebrows, group labels.

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
        fontWeight: 600,
        letterSpacing: "0.12em",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

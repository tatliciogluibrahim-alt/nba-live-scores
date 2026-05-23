import { createElement } from "react";
import type { CSSProperties, ReactNode } from "react";

// Editorial display headline. Used at most once per scroll viewport.
// Reserved for the moment that earns it (e.g. "One-possession game.",
// "Series tied 1–1.", "Quiet evening.").

export type DisplaySize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<DisplaySize, { fontSize: string; lineHeight: number }> = {
  sm: { fontSize: "1.4rem", lineHeight: 1.1 },
  md: { fontSize: "1.75rem", lineHeight: 1.08 },
  lg: { fontSize: "2.1rem", lineHeight: 1.05 },
  xl: { fontSize: "2.6rem", lineHeight: 1.02 },
};

export function Display({
  children,
  size = "md",
  as = "h2",
  className,
  style,
}: {
  children: ReactNode;
  size?: DisplaySize;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  style?: CSSProperties;
}) {
  const s = SIZE[size];
  return createElement(
    as,
    {
      className,
      style: {
        fontFamily: "var(--font-display)",
        color: "var(--ink)",
        letterSpacing: "-0.01em",
        margin: 0,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        ...style,
      } satisfies CSSProperties,
    },
    children
  );
}

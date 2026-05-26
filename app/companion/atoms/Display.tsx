import { createElement } from "react";
import type { CSSProperties, ReactNode } from "react";

// Editorial display headline. Used at most once per scroll viewport.
// Reserved for the moment that earns it (e.g. "One-possession game.",
// "Series tied 1–1.", "Quiet evening.").

export type DisplaySize = "xs" | "sm" | "md" | "lg" | "xl";

// `xs` (1.15rem) is the card-level state size — used when a card needs a
// touch of editorial weight without competing with page H1s. Added in
// Stage 15B so the Stage 14F-5 "card heaviness" fix has a token to land
// against. Don't drift `md` / `lg` down further; instead reach for `xs`.
//
// Phase 8 polish: `lg` line-height bumped from 1.05 → 1.1 so two-line
// page H1s (e.g. long country names like "Bosnia & Herzegovina" or
// "Saudi Arabia vs Mexico") don't crowd. The 1.05 was tuned for
// Impact's tight metrics; Bricolage Grotesque needs a bit more air.
const SIZE: Record<DisplaySize, { fontSize: string; lineHeight: number }> = {
  xs: { fontSize: "1.15rem", lineHeight: 1.18 },
  sm: { fontSize: "1.4rem", lineHeight: 1.1 },
  md: { fontSize: "1.75rem", lineHeight: 1.08 },
  lg: { fontSize: "2.1rem", lineHeight: 1.1 },
  xl: { fontSize: "2.6rem", lineHeight: 1.05 },
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
        // Default to weight 700 for editorial intent. Without an
        // explicit fontWeight the variable Bricolage Grotesque falls
        // back to 400, which reads too light at display sizes and
        // makes display headlines look like body copy.
        fontWeight: 700,
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

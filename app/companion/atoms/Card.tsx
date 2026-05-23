import type { CSSProperties, ReactNode } from "react";

// Canonical companion card. One grammar: rounded 14px, hairline border,
// cream/paper surface. The optional accent prop draws a 3px left border —
// reserved by design contract for HeroMoment, NextMatchBlock, and the
// North Star hero card only. Don't borderize every card.

type Surface = "paper" | "cream-2";

const SURFACE_BG: Record<Surface, string> = {
  paper: "var(--paper)",
  "cream-2": "var(--cream-2)",
};

const PADDING_CLASS = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "px-4 py-5",
} as const;

export type CardProps = {
  children: ReactNode;
  /** When set, draws a 3px left border in this color. Use sparingly. */
  accent?: string;
  surface?: Surface;
  padding?: keyof typeof PADDING_CLASS;
  className?: string;
  style?: CSSProperties;
};

export function Card({
  children,
  accent,
  surface = "paper",
  padding = "md",
  className,
  style,
}: CardProps) {
  return (
    <div
      className={[
        "rounded-[14px]",
        "border",
        PADDING_CLASS[padding],
        className ?? "",
      ].join(" ")}
      style={{
        background: SURFACE_BG[surface],
        borderColor: "var(--line)",
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

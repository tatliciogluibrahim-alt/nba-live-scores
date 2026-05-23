import type { ReactNode } from "react";
import { Display } from "../atoms/Display";

// The single editorial moment on a screen. Accented left border, optional
// live pulse dot, display-type headline + optional context line.
// Per design contract: only HeroMoment / NextMatchBlock / North Star hero
// card may use the accent left border. Use it sparingly.

export function HeroMoment({
  eyebrow,
  headline,
  context,
  accent = "var(--nba)",
  live = false,
  footer,
}: {
  eyebrow: string;
  headline: string;
  context?: string;
  /** Sport-accent color. Use var(--nba) or var(--wc). */
  accent?: string;
  /** Adds a pulsing dot to the eyebrow row. */
  live?: boolean;
  /** Optional slot below context (e.g. WatchLine). */
  footer?: ReactNode;
}) {
  return (
    <article
      className="rounded-[14px] border px-4 py-4 sm:px-5 sm:py-5"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center gap-1.5">
        {live ? (
          <span
            aria-hidden
            className="no-noise-live-fade h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: accent }}
          />
        ) : null}
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: accent,
          }}
        >
          {eyebrow}
        </span>
      </div>

      <Display size="md" as="h2" className="mt-2">
        {headline}
      </Display>

      {context ? (
        <p
          className="mt-2 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {context}
        </p>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </article>
  );
}

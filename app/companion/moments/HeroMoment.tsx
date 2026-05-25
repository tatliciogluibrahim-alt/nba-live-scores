import type { ReactNode } from "react";

// The single editorial moment on a screen. Accented left border, optional
// live pulse dot, strong body-sans headline + optional context line.
// Per design contract: only HeroMoment / NextMatchBlock / North Star hero
// card may use the accent left border. Use it sparingly.

export function HeroMoment({
  eyebrow,
  headline,
  context,
  accent = "var(--nba)",
  live = false,
  surface,
  footer,
  /** When true, drop the 3px sport-accent left rail and use a calm
   *  paper card instead. Reserve the accent rail for live / upcoming
   *  moments where the user might act; once a game is final the rail
   *  promises an "act now" that no longer exists. */
  muted = false,
}: {
  eyebrow: string;
  headline: string;
  context?: string;
  /** Sport-accent color. Use var(--nba) or var(--wc). */
  accent?: string;
  /** Adds a pulsing dot to the eyebrow row. */
  live?: boolean;
  /** Optional card surface override. Pass var(--nba-soft) when the game
   *  is live so the card feels warmer than an upcoming/final card. */
  surface?: string;
  /** Optional slot below context (e.g. WatchLine). */
  footer?: ReactNode;
  muted?: boolean;
}) {
  return (
    <article
      className="rounded-[14px] border px-4 py-4 sm:px-5 sm:py-5"
      style={{
        background: surface ?? "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: muted ? "1px solid var(--line)" : `3px solid ${accent}`,
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

      <h2
        className="mt-2 text-[19px] leading-tight"
        style={{ color: "var(--ink)", fontWeight: 800 }}
      >
        {headline}
      </h2>

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

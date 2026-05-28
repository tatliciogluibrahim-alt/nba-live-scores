"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useNoSpoilers } from "../providers";
import { useReveal } from "./reveal";

// Score-hidden card with explicit, context-aware reveal copy:
//   - 'live'   → "Tap to reveal score"
//   - 'final'  → "Tap to see who won"
//   - 'series' → "Tap to see who advanced"
//
// Schedule + where-to-watch (passed in via `details` slot) stay visible
// even when scores are hidden. (HANDOFF.md §6 / REFINEMENT.md §1.3)

export type NoSpoilerKind = "live" | "final" | "series";

const REVEAL_COPY: Record<NoSpoilerKind, string> = {
  live: "Tap to reveal score",
  final: "Tap to see who won",
  series: "Tap to see who advanced",
};

export function NoSpoilerGameCard({
  kind = "final",
  matchup,
  ariaSubject,
  details,
  revealed: revealedProp,
  gameId,
  children,
}: {
  kind?: NoSpoilerKind;
  /** Short header text, e.g. "NYK · CLE". */
  matchup: string;
  /** Subject used in the reveal button's aria-label. */
  ariaSubject?: string;
  /** Schedule / where-to-watch / reminder content. Stays visible always. */
  details?: ReactNode;
  /** When provided, overrides internal state (e.g. parent controls reveal). */
  revealed?: boolean;
  /** When set, reveal is shared across all of this game's surfaces. */
  gameId?: string;
  /** Children render in place of the hidden card when revealed. */
  children?: ReactNode;
}) {
  const noSpoilers = useNoSpoilers();
  const { isRevealed, reveal } = useReveal();
  const [internalRevealed, setInternalRevealed] = useState(false);
  const revealed =
    revealedProp ?? (gameId ? isRevealed(gameId) : internalRevealed);

  if (!noSpoilers || revealed) {
    return <>{children}</>;
  }

  const aria = ariaSubject
    ? `Reveal ${ariaSubject} score, hidden by No-Spoilers mode`
    : `Reveal score, hidden by No-Spoilers mode`;

  return (
    <article
      className="rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[13px]"
          style={{
            color: "var(--ink)",
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          {matchup}
        </span>
        <span
          aria-hidden
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            letterSpacing: "0.18em",
            color: "var(--mute-1)",
          }}
        >
          • • •
        </span>
      </div>
      <span className="sr-only">Score hidden by No-Spoilers mode.</span>

      <button
        type="button"
        onClick={() => (gameId ? reveal(gameId) : setInternalRevealed(true))}
        aria-label={aria}
        className="no-noise-reveal-focus mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
        }}
      >
        {REVEAL_COPY[kind]}
      </button>

      {details ? <div className="mt-3 space-y-2">{details}</div> : null}
    </article>
  );
}

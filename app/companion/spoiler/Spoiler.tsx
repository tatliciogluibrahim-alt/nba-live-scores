"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useNoSpoilers } from "../providers";
import { useReveal } from "./reveal";

// Inline score wrapper. When No-Spoilers is on, blurs the wrapped content
// behind a tap-to-reveal button. When No-Spoilers is off (or after reveal),
// renders children inline as a plain span with tabular numerals.
//
// Reveal model: pass `gameId` to tie this blur to the shared per-game
// reveal — one tap reveals every Spoiler (and every other spoiler-gated
// surface) for that game at once. Without a `gameId` it falls back to
// local per-instance reveal (used by surfaces not tied to a single game).
//
// For full game cards, prefer `NoSpoilerGameCard` which gives a more
// considered hidden state with context-aware reveal copy.

export function Spoiler({
  children,
  ariaSubject,
  gameId,
}: {
  children: ReactNode;
  /** Subject text used in aria-label, e.g. "Knicks vs Cavaliers". */
  ariaSubject?: string;
  /** When set, reveal is shared across all of this game's surfaces. */
  gameId?: string;
}) {
  const noSpoilers = useNoSpoilers();
  const { isRevealed, reveal } = useReveal();
  const [localRevealed, setLocalRevealed] = useState(false);
  const revealed = gameId ? isRevealed(gameId) : localRevealed;

  if (!noSpoilers || revealed) {
    return (
      <span className="tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
        {children}
      </span>
    );
  }

  const label = ariaSubject
    ? `Reveal ${ariaSubject} score, hidden by No-Spoilers mode`
    : "Reveal score, hidden by No-Spoilers mode";

  // Frosted-blur treatment (design study A). The number is blurred (and
  // aria-hidden), but a dotted baseline cue stays sharp so the cell
  // reads as a deliberate, tappable hidden score — never as broken or
  // mid-load. The blur lives on an inner span so the cue itself is
  // unaffected.
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (gameId) reveal(gameId);
        else setLocalRevealed(true);
      }}
      aria-label={label}
      className="no-noise-reveal-focus tabular-nums"
      style={{
        display: "inline",
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
        userSelect: "none",
        borderBottom: "1px dotted var(--mute-2)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span
        aria-hidden
        style={{ filter: "blur(7px)", opacity: 0.85, display: "inline-block" }}
      >
        {children}
      </span>
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useReveal, useEffectiveNoSpoilers } from "./reveal";

// Inline score wrapper. When No-Spoilers is on, the wrapped content is
// REDACTED AT THE DATA LEVEL (Courtside C2, spec 2026-08-31): the real
// digits never render — the hidden state is a chip of placeholder glyphs
// derived from the score's shape ("121 – 109" becomes "•• – ••"), inside
// the same tap-to-reveal button. The pre-C2 treatment blurred the real
// digits, which left them exposed to VoiceOver, copy, find-in-page, and
// screenshot zoom while the product promised they were hidden.
// When No-Spoilers is off (or after reveal), renders children inline as
// a plain span with tabular numerals.
//
// Reveal model: pass `gameId` to tie this blur to the shared per-game
// reveal — one tap reveals every Spoiler (and every other spoiler-gated
// surface) for that game at once. Without a `gameId` it falls back to
// local per-instance reveal (used by surfaces not tied to a single game).
//
// For full game cards, prefer `NoSpoilerGameCard` which gives a more
// considered hidden state with context-aware reveal copy.

/** Placeholder glyphs for a hidden score: every digit run becomes "••",
 *  separators and suffixes survive ("2 – 1 (4–3p)" → "•• – •• (••–••p)")
 *  so the redacted cell keeps the shape of the fact it is hiding without
 *  carrying any of it. Non-text children fall back to a bare "••". */
export function redactScore(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    const out = String(children).replace(/\d+/g, "\u2022\u2022");
    return out.trim() === "" ? "\u2022\u2022" : out;
  }
  return "\u2022\u2022";
}

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
  // Effective hidden state honors the per-follow GameSpoilerScope, not just the
  // global toggle — so selective No-Spoilers (the paid feature) actually hides
  // the score even with the global toggle off. Falls back to global outside a
  // scope.
  const noSpoilers = useEffectiveNoSpoilers(gameId);
  const { isRevealed, reveal } = useReveal();
  const [localRevealed, setLocalRevealed] = useState(false);
  // One-shot flag set on the reveal tap so the score resolves into focus
  // (animated) only then — never on a never-hidden score or an
  // already-revealed mount. Cleared after the animation plays.
  const [justRevealed, setJustRevealed] = useState(false);
  const revealed = gameId ? isRevealed(gameId) : localRevealed;

  useEffect(() => {
    if (!justRevealed) return;
    const t = setTimeout(() => setJustRevealed(false), 300);
    return () => clearTimeout(t);
  }, [justRevealed]);

  if (!noSpoilers || revealed) {
    return (
      <span
        className={`tabular-nums${justRevealed ? " nns-reveal-in" : ""}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {children}
      </span>
    );
  }

  const label = ariaSubject
    ? `${ariaSubject} score hidden by No-Spoilers. Tap to reveal.`
    : "Score hidden by No-Spoilers. Tap to reveal.";

  // The chip: placeholder glyphs on the chip tokens, sized by the font
  // context it sits in (em padding), so an agate cell gets a small chip
  // and the Monument gets a monumental one. No blur — there is nothing
  // behind the frost to hide. Reduce Transparency needs no special case
  // for the same reason.
  return (
    <button
      type="button"
      onClick={(e) => {
        // Safety net for legacy rows that still put the reveal inside a link.
        // The migrated overlay-link rows no longer nest interactive elements.
        e.preventDefault();
        e.stopPropagation();
        if (gameId) reveal(gameId);
        else setLocalRevealed(true);
        setJustRevealed(true);
      }}
      aria-label={label}
      className="no-noise-reveal-focus tabular-nums"
      style={{
        display: "inline-block",
        padding: "0.05em 0.45em",
        margin: 0,
        border: "1.5px solid var(--chip-line)",
        borderRadius: "0.35em",
        background: "var(--chip-bg)",
        font: "inherit",
        color: "var(--mute-1)",
        letterSpacing: "0.08em",
        cursor: "pointer",
        userSelect: "none",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span aria-hidden>{redactScore(children)}</span>
    </button>
  );
}

"use client";

import { useNoSpoilers } from "../providers";
import { useReveal } from "./reveal";

// One prominent control that reveals an entire game's results at once.
// Replaces the old per-component scatter (tap the score, tap each
// highlight, tap the recap...). Renders only when No-Spoilers is on and
// this game hasn't been revealed yet this session.

const COPY: Record<"live" | "final" | "series", string> = {
  live: "Reveal score and details",
  final: "Reveal the result",
  series: "Reveal the result",
};

export function RevealResultsButton({
  gameId,
  kind = "final",
  className,
}: {
  gameId: string;
  kind?: "live" | "final" | "series";
  className?: string;
}) {
  const noSpoilers = useNoSpoilers();
  const { isRevealed, reveal } = useReveal();

  if (!noSpoilers || isRevealed(gameId)) return null;

  return (
    <button
      type="button"
      onClick={() => reveal(gameId)}
      aria-label={`${COPY[kind]}, hidden by No-Spoilers mode`}
      className={`no-noise-reveal-focus inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98] ${className ?? ""}`}
      style={{
        background: "var(--ink)",
        color: "var(--cream)",
        border: "1px solid var(--ink)",
      }}
    >
      {COPY[kind]}
    </button>
  );
}

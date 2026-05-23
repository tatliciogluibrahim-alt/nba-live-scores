"use client";

import Link from "next/link";
import { useNoSpoilers } from "../providers";
import type { SeriesDot, SeriesDotState } from "./series-data";

// Compact 7-game schedule strip. Under No-Spoilers, dots never reveal
// winners or whether subsequent games will be played (the "if-necessary"
// state itself would imply a series outcome).
//
// State legend (No-Spoilers off):
//   played          — filled neutral dot (winner color reveal lives in
//                     /game/[id] only — even off-spoiler we keep the strip
//                     visually calm)
//   live            — breathing accent dot
//   next            — outline filled-on-hover; ink ring
//   scheduled       — outline ring
//   if-necessary    — dashed outline
//   tbd             — dashed outline at lower opacity
//
// Under No-Spoilers we collapse the spoilery distinctions: every played
// game looks the same regardless of winner, and "if-necessary" downgrades
// to "scheduled" so we don't expose the clinch state.

function normalizeForSpoilers(
  state: SeriesDotState,
  noSpoilers: boolean
): SeriesDotState {
  if (!noSpoilers) return state;
  if (state === "if-necessary") return "scheduled";
  return state;
}

function dotStyle(state: SeriesDotState): React.CSSProperties {
  switch (state) {
    case "played":
      return {
        background: "var(--ink)",
        border: "1.5px solid var(--ink)",
      };
    case "live":
      return {
        background: "var(--nba)",
        border: `1.5px solid var(--nba)`,
      };
    case "next":
      return {
        background: "transparent",
        border: "1.5px solid var(--ink)",
        boxShadow: "inset 0 0 0 2px var(--cream)",
      };
    case "scheduled":
      return {
        background: "transparent",
        border: "1.5px solid var(--mute-2)",
      };
    case "if-necessary":
      return {
        background: "transparent",
        border: "1.5px dashed var(--mute-2)",
      };
    case "tbd":
      return {
        background: "transparent",
        border: "1.5px dashed var(--mute-2)",
        opacity: 0.5,
      };
  }
}

function ariaLabel(dot: SeriesDot, displayState: SeriesDotState, noSpoilers: boolean): string {
  if (displayState === "live") return `Game ${dot.number} is live`;
  if (displayState === "next") return `Game ${dot.number} is next`;
  if (displayState === "played") {
    return noSpoilers
      ? `Game ${dot.number} played`
      : `Game ${dot.number} played${dot.scoreLine ? `, ${dot.scoreLine}` : ""}`;
  }
  if (displayState === "scheduled") return `Game ${dot.number} scheduled`;
  if (displayState === "if-necessary")
    return `Game ${dot.number} if necessary`;
  return `Game ${dot.number} not scheduled yet`;
}

export function SevenDotStrip({ dots }: { dots: SeriesDot[] }) {
  const noSpoilers = useNoSpoilers();

  return (
    <ul className="flex items-center gap-2" aria-label="Series schedule">
      {dots.map((dot) => {
        const display = normalizeForSpoilers(dot.state, noSpoilers);
        const linkable =
          Boolean(dot.gameId) &&
          (display === "played" || display === "live" || display === "next");
        const breathing = display === "live";

        const dotNode = (
          <span
            aria-hidden
            className={`grid h-[26px] w-[26px] place-items-center rounded-full ${
              breathing ? "no-noise-live-fade" : ""
            }`}
            style={dotStyle(display)}
          >
            <span
              className="text-[9px]"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.02em",
                color:
                  display === "played" || display === "live"
                    ? "var(--cream)"
                    : "var(--mute-1)",
              }}
            >
              {dot.number}
            </span>
          </span>
        );

        const aria = ariaLabel(dot, display, noSpoilers);

        return (
          <li key={dot.number}>
            {linkable && dot.gameId ? (
              <Link
                href={`/game/${dot.gameId}`}
                aria-label={aria}
                className="block transition active:scale-[0.95]"
              >
                {dotNode}
              </Link>
            ) : (
              <span aria-label={aria} role="img">
                {dotNode}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useNoSpoilers } from "../providers";
import { getTeam } from "../following/data/teams";
import type { SeriesDot, SeriesDotState } from "./series-data";

// Compact 7-game schedule strip. Under No-Spoilers, dots never reveal
// winners or whether subsequent games will be played (the "if-necessary"
// state itself would imply a series outcome).
//
// State legend (No-Spoilers off):
//   played          — filled neutral dot. Tapping reveals a small detail
//                     card below the strip (game number, score, date, link).
//   live            — breathing accent dot. Links straight to /game/[id].
//   next            — outline filled-on-hover; ink ring. Links straight to
//                     /game/[id] (no detail card — nothing happened yet).
//   scheduled       — outline ring (non-interactive)
//   if-necessary    — dashed outline (non-interactive)
//   tbd             — dashed outline at lower opacity (non-interactive)
//
// Under No-Spoilers we collapse spoilery distinctions:
//   - every played game looks the same regardless of winner
//   - "if-necessary" stays dashed; schedules are public structure
//   - the inline detail card still opens on tap, but the score row is
//     Spoiler-wrapped (blurred until the user explicitly reveals it).

function normalizeForSpoilers(
  state: SeriesDotState,
  noSpoilers: boolean
): SeriesDotState {
  if (!noSpoilers) return state;
  return state;
}

function dotStyle(state: SeriesDotState, isSelected: boolean): React.CSSProperties {
  // Selected played dot gets a 2px ring in the cream so it visibly
  // separates from the others without changing the strip's overall
  // weight. Other states ignore selection (they're not toggleable).
  const ring =
    isSelected && state === "played"
      ? { boxShadow: "0 0 0 2px var(--cream), 0 0 0 3.5px var(--ink)" }
      : null;

  switch (state) {
    case "played":
      return {
        background: "var(--ink)",
        border: "1.5px solid var(--ink)",
        ...ring,
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

function ariaLabel(
  dot: SeriesDot,
  displayState: SeriesDotState,
  noSpoilers: boolean
): string {
  if (displayState === "live") return `Game ${dot.number} is live`;
  if (displayState === "next") return `Game ${dot.number} is next`;
  if (displayState === "played") {
    // Under No-Spoilers we never name the winner. Without No-Spoilers
    // and when we know who won, use the team's nickname ("Spurs",
    // "Knicks") — that's how a fan would say it out loud, not "SA" or
    // "San Antonio Spurs".
    if (noSpoilers) {
      return `Game ${dot.number} played, tap to reveal details`;
    }
    const winnerTeam = dot.winnerCode ? getTeam(dot.winnerCode) : undefined;
    if (winnerTeam) {
      return `Game ${dot.number}, ${winnerTeam.name} won`;
    }
    return `Game ${dot.number} played, tap to reveal score`;
  }
  if (displayState === "scheduled") return `Game ${dot.number} scheduled`;
  if (displayState === "if-necessary")
    return `Game ${dot.number} if necessary`;
  return `Game ${dot.number} not scheduled yet`;
}

/** Pull away/home scores out of the adapter's "112 – 108" string. The
 *  adapter always writes `${away} – ${home}` in that order (series-data
 *  builds it that way), so parsing positionally is safe. Tolerant of
 *  en-dash, hyphen, or em-dash. */
function parseScoreLine(line: string | undefined): [number, number] | null {
  if (!line) return null;
  const m = line.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export function SevenDotStrip({ dots }: { dots: SeriesDot[] }) {
  const noSpoilers = useNoSpoilers();
  const [selected, setSelected] = useState<number | null>(null);

  const selectedDot =
    selected !== null ? dots.find((d) => d.number === selected) ?? null : null;
  const selectedIsPlayed =
    selectedDot !== null &&
    normalizeForSpoilers(selectedDot.state, noSpoilers) === "played";

  return (
    <div>
      <ul className="grid grid-cols-7 gap-1" aria-label="Series schedule">
        {dots.map((dot) => {
          const display = normalizeForSpoilers(dot.state, noSpoilers);
          const isPlayed = display === "played";
          const linkable =
            !isPlayed &&
            Boolean(dot.gameId) &&
            (display === "live" || display === "next");
          const breathing = display === "live";
          const isSelected = selected === dot.number;
          const dotLabel =
            display === "played" && !noSpoilers && dot.winnerCode
              ? dot.winnerCode.toUpperCase()
              : String(dot.number);

          const dotNode = (
            <span
              aria-hidden
              className={`grid h-[32px] w-[32px] place-items-center rounded-full ${
                breathing ? "no-noise-live-fade" : ""
              }`}
              style={dotStyle(display, isSelected)}
            >
              {/* Played dots show the winning team's abbreviation (up to
                  full abbreviation — "NYK", "OKC", "MIL" — so game detail
                  and series detail speak the same shorthand. Suppressed under
                  No-Spoilers. Falls back to the game number when winnerCode
                  is absent. */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: dotLabel.length > 2 ? 10 : 11,
                  fontWeight: 700,
                  letterSpacing: 0,
                  lineHeight: 1,
                  color:
                    display === "played" || display === "live"
                      ? "var(--cream)"
                      : "var(--mute-1)",
                }}
              >
                {dotLabel}
              </span>
            </span>
          );

          const aria = ariaLabel(dot, display, noSpoilers);

          // Played dots become buttons that toggle the inline detail
          // card below the strip. Tap-same-dot-again to collapse,
          // tap-different-dot to switch.
          if (isPlayed) {
            return (
              <li key={dot.number}>
                <button
                  type="button"
                  aria-label={aria}
                  aria-expanded={isSelected}
                  onClick={() =>
                    setSelected((prev) => (prev === dot.number ? null : dot.number))
                  }
                  className="no-noise-reveal-focus grid h-11 w-11 place-items-center transition active:scale-[0.95]"
                >
                  {dotNode}
                </button>
              </li>
            );
          }

          // Live/next dots route straight through — nothing to reveal
          // since the relevant info is on the destination page.
          return (
            <li key={dot.number}>
              {linkable && dot.gameId ? (
                <Link
                  href={`/game/${dot.gameId}`}
                  aria-label={aria}
                  className="grid h-11 w-11 place-items-center transition active:scale-[0.95]"
                >
                  {dotNode}
                </Link>
              ) : (
                <span aria-label={aria} role="img" className="grid h-11 w-11 place-items-center">
                  {dotNode}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Inline detail card — only for played dots. Renders the score
          through <Spoiler> so No-Spoilers mode still gates the reveal. */}
      {selectedDot && selectedIsPlayed ? (
        <PlayedGameDetail dot={selectedDot} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function PlayedGameDetail({
  dot,
  onClose,
}: {
  dot: SeriesDot;
  onClose: () => void;
}) {
  const scores = parseScoreLine(dot.scoreLine);
  const dateLabel = formatDate(dot.date);
  const subject =
    dot.awayCode && dot.homeCode
      ? `${dot.awayCode} vs ${dot.homeCode}`
      : `Game ${dot.number}`;

  return (
    <article
      className="mt-3 rounded-[14px] border px-3.5 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
      aria-label={`Game ${dot.number} details`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>
          Game {dot.number}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </Eyebrow>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close game details"
          className="no-noise-reveal-focus inline-flex min-h-[44px] items-center text-[11px] underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Close
        </button>
      </div>

      {scores && dot.awayCode && dot.homeCode ? (
        <p
          className="mt-2 text-[20px] leading-none"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          <Spoiler ariaSubject={subject} gameId={dot.gameId}>
            {dot.awayCode} {scores[0]} – {scores[1]} {dot.homeCode}
          </Spoiler>
        </p>
      ) : null}

      {dot.gameId ? (
        <Link
          href={`/game/${dot.gameId}`}
          aria-label={`Open Game ${dot.number}`}
          className="mt-3 inline-flex min-h-[44px] items-center text-[12px] underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Open game
        </Link>
      ) : null}
    </article>
  );
}

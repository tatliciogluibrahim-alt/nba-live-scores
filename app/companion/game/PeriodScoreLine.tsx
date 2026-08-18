"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useEffectiveNoSpoilers } from "../spoiler/reveal";
import { PeriodScoreTable } from "./PeriodScoreTable";
import type { Game } from "../../nba/types";

// Per-quarter scoring breakdown for an NBA game. Compact table — each
// quarter (and any OTs) as a column, each team's line as a row, total
// at the end. The mobile-first format that NBA fans expect ("Q1 28-24
// · Q2 26-25 · Q3 24-23 · Q4 30-19") rendered as an actual table so
// the columns align cleanly in tabular-nums.
//
// The grid itself now lives in PeriodScoreTable (shared with the NFL
// detail — quarters are quarters). This file stays the NBA-typed wrapper:
// it reads periodScores off the NBA Game and owns the reveal scope.
//
// Only renders when periodScores has data (live games after Q1 starts,
// final games). Upcoming games and the pre-tipoff "0–0" state are
// skipped — there's nothing useful to show until at least one period
// has logged scores.
//
// No-Spoilers: scores wrapped in <Spoiler>. Quarter labels stay
// visible because "the game has reached Q3" is structural, not a
// spoiler. The score itself is what the user opted to hide.

export function PeriodScoreLine({
  game,
  headless = false,
}: {
  game: Game;
  /** System D (D2): the mobile column wraps this in a SecHead, so the
   *  component drops its own Eyebrow header. Default false keeps the
   *  desktop rail card pixel-identical. */
  headless?: boolean;
}) {
  const noSpoilers = useEffectiveNoSpoilers(game.id);
  const away = game.periodScores?.away ?? [];
  const home = game.periodScores?.home ?? [];

  // Need at least one period with scores to render anything useful.
  if (Math.max(away.length, home.length) === 0) return null;

  return (
    <section aria-label="Per-quarter scoring">
      {headless ? null : (
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>By quarter</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
      )}
      <PeriodScoreTable
        awayCode={game.away.abbreviation}
        homeCode={game.home.abbreviation}
        away={away}
        home={home}
        gameId={game.id}
        spoilerSubject={`${game.away.abbreviation} vs ${game.home.abbreviation}`}
        noSpoilers={noSpoilers}
      />
    </section>
  );
}

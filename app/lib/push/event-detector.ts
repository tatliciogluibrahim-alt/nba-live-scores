// Compares a freshly-fetched game state with the last cached state and
// emits zero or more push-worthy events. Pure function — no I/O. The
// caller is responsible for persisting the new state afterwards.
//
// Event taxonomy (Stage C v1):
//   • tipoff       — status flipped upcoming → live
//   • eoq-1/2/3    — live game's period incremented (skip eoq-4; "final"
//                    fires for end-of-Q4)
//   • close-game   — live game in Q4 with ≤5pt margin AND we haven't
//                    fired close-game for this game yet. Game-once.
//   • final        — status flipped live → final
//
// Deferred to a later pass:
//   • comeback     — needs reliable max-lead tracking + heuristics that
//                    don't false-positive on normal Q4 runs. Stub left
//                    in CachedGameState (maxLead) so v2 doesn't need a
//                    schema migration.

import type { CachedGameState } from "./state-cache";

export type EventType =
  | "tipoff"
  | "eoq-1"
  | "eoq-2"
  | "eoq-3"
  | "close-game"
  | "final";

export type PushEvent = {
  type: EventType;
  gameId: string;
  /** Both team abbreviations — the matcher needs them to look up which
   *  users follow either side. */
  awayCode: string;
  homeCode: string;
};

export type FreshGameState = {
  gameId: string;
  status: "upcoming" | "live" | "final";
  period: number;
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  /** Approximate seconds remaining in current period when known. The
   *  NBA scoreboard "statusText" often reads "Q4 4:31" — the caller
   *  parses this into a number before passing it in. Null when not
   *  parseable (halftime, end of period, etc). */
  secondsRemaining: number | null;
};

const CLOSE_GAME_PERIOD = 4;
const CLOSE_GAME_MARGIN = 5;
const CLOSE_GAME_MAX_SECONDS = 5 * 60; // last 5 minutes of Q4

export function detectEvents(
  prev: CachedGameState | null,
  next: FreshGameState
): { events: PushEvent[]; nextState: CachedGameState } {
  const baseInfo = {
    gameId: next.gameId,
    awayCode: next.awayCode,
    homeCode: next.homeCode,
  };
  const events: PushEvent[] = [];

  const currentMargin = Math.abs(next.awayScore - next.homeScore);
  const maxLead = Math.max(prev?.maxLead ?? 0, currentMargin);

  // Transition 1: upcoming → live → tipoff event.
  // We emit only on the actual transition. If we never saw the upcoming
  // state (cron started after tipoff), we don't fire — better to miss a
  // late-join push than fan out a tipoff push 30 minutes after tipoff.
  if (prev?.status === "upcoming" && next.status === "live") {
    events.push({ ...baseInfo, type: "tipoff" });
  }

  // Transition 2: live game, period incremented (1→2, 2→3, 3→4).
  // We don't fire for 4→OT or for the final period itself — the "final"
  // event covers the actual game end.
  if (
    prev?.status === "live" &&
    next.status === "live" &&
    next.period > (prev?.period ?? 0) &&
    next.period >= 2 &&
    next.period <= 4
  ) {
    const justEnded = next.period - 1;
    if (justEnded === 1) events.push({ ...baseInfo, type: "eoq-1" });
    else if (justEnded === 2) events.push({ ...baseInfo, type: "eoq-2" });
    else if (justEnded === 3) events.push({ ...baseInfo, type: "eoq-3" });
  }

  // Transition 3: live → final → final event.
  if (prev?.status === "live" && next.status === "final") {
    events.push({ ...baseInfo, type: "final" });
  }

  // Close-game window: Q4, last 5 min, margin ≤ 5, not yet fired for
  // this game. We require explicit secondsRemaining so we don't false-
  // fire during halftime or end-of-period gaps where the clock isn't
  // ticking. Once per game.
  const closeGameFired = prev?.closeGameFired ?? false;
  let nextCloseGameFired = closeGameFired;
  if (
    next.status === "live" &&
    next.period === CLOSE_GAME_PERIOD &&
    typeof next.secondsRemaining === "number" &&
    next.secondsRemaining <= CLOSE_GAME_MAX_SECONDS &&
    currentMargin <= CLOSE_GAME_MARGIN &&
    !closeGameFired
  ) {
    events.push({ ...baseInfo, type: "close-game" });
    nextCloseGameFired = true;
  }

  const nextState: CachedGameState = {
    gameId: next.gameId,
    status: next.status,
    period: next.period,
    awayCode: next.awayCode,
    homeCode: next.homeCode,
    awayScore: next.awayScore,
    homeScore: next.homeScore,
    maxLead,
    closeGameFired: nextCloseGameFired,
    updatedAt: Date.now(),
  };

  return { events, nextState };
}

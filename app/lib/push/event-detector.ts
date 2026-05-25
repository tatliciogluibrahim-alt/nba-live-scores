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
  | "comeback"
  | "final";

export type PushEvent = {
  type: EventType;
  gameId: string;
  /** Both team abbreviations — the matcher needs them to look up which
   *  users follow either side. */
  awayCode: string;
  homeCode: string;
  /** Live scores at the moment the event fires. The dispatcher includes
   *  them in the push body for non-No-Spoilers users so the lock screen
   *  ping is actually useful ("OKC 78 – 82 SA") instead of just calm
   *  decoration ("Quarter wrapped"). */
  awayScore: number;
  homeScore: number;
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

// Comeback heuristic (Phase 2.2):
//   A game qualifies as a comeback when one team led by at least
//   COMEBACK_MIN_LEAD points at some point earlier in the game, and the
//   current margin has shrunk to COMEBACK_NOW_MARGIN or less while the
//   game is live in Q3 or Q4. Fires once per game.
//
// 15 / 5 was picked as a balance — strict enough that a normal Q4 run
// doesn't false-positive, loose enough that real comebacks register.
// Tune with real game data once friends-test produces enough volume.
const COMEBACK_MIN_LEAD = 15;
const COMEBACK_NOW_MARGIN = 5;
const COMEBACK_MIN_PERIOD = 3;

/** Status ranks for monotonic state — once a game has gone forward
 *  along this axis, we treat any backward regression as a feed glitch
 *  and pin the status forward. Without this, a transient `live →
 *  upcoming → live` blip from the upstream would re-fire tipoff after
 *  the dedupe TTL expires (Codex QA #4). */
const STATUS_RANK: Record<FreshGameState["status"], number> = {
  upcoming: 0,
  live: 1,
  final: 2,
};

export function detectEvents(
  prev: CachedGameState | null,
  next: FreshGameState
): { events: PushEvent[]; nextState: CachedGameState } {
  // If the feed appears to regress (e.g. a brief `live → upcoming`),
  // hold onto the prior forward state for diff purposes. We still
  // accept new scores and period numbers, but the status — the most
  // event-relevant field — pins to its highest-seen value.
  const stableStatus: FreshGameState["status"] =
    prev && STATUS_RANK[prev.status] > STATUS_RANK[next.status]
      ? prev.status
      : next.status;
  const stableNext: FreshGameState = { ...next, status: stableStatus };

  const baseInfo = {
    gameId: stableNext.gameId,
    awayCode: stableNext.awayCode,
    homeCode: stableNext.homeCode,
    awayScore: stableNext.awayScore,
    homeScore: stableNext.homeScore,
  };
  const events: PushEvent[] = [];

  const currentMargin = Math.abs(stableNext.awayScore - stableNext.homeScore);
  const maxLead = Math.max(prev?.maxLead ?? 0, currentMargin);

  // Re-bind `next` to the stabilized version for the rest of detection.
  // Keeps the existing detection logic readable.
  next = stableNext;

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

  // Comeback window: live game in Q3+, max-lead-seen was ≥ 15, current
  // margin is ≤ 5, hasn't fired yet for this game. Doesn't need a
  // seconds-remaining check — the criterion is the margin shift, which
  // is independent of clock state.
  const comebackFired = prev?.comebackFired ?? false;
  let nextComebackFired = comebackFired;
  if (
    next.status === "live" &&
    next.period >= COMEBACK_MIN_PERIOD &&
    maxLead >= COMEBACK_MIN_LEAD &&
    currentMargin <= COMEBACK_NOW_MARGIN &&
    !comebackFired
  ) {
    events.push({ ...baseInfo, type: "comeback" });
    nextComebackFired = true;
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
    comebackFired: nextComebackFired,
    updatedAt: Date.now(),
  };

  return { events, nextState };
}

// World Cup event detector. Compares a freshly-fetched WC fixture state
// with the last cached state and emits zero or more push-worthy events.
// Pure function — caller persists the new state afterwards.
//
// Event taxonomy (v3):
//   • wc-kickoff  — status flipped upcoming → live
//   • wc-halftime — minute crossed from ≤45 to >45 while live (second
//                   half started). Fires once per game via halftimeFired.
//   • wc-goal     — scoreline rose while live (any goal: open play, pen,
//                   own goal). No scorer name (scoreboard feed only).
//   • wc-final    — status flipped live → final
//
// Deferred:
//   • wc-comeback  — same problem space as the NBA version, plus soccer
//                    margins read differently.
//
// We use the same PushEvent shape as the NBA detector so the dispatcher
// can fan out either kind through one code path. `source` discriminates:
// for WC events, awayCode/homeCode are country ISO codes (USA, BRA),
// not team abbreviations.

import type { CachedWCGameState } from "./wc-state-cache";
import type { PushEvent } from "./event-detector";

export type FreshWCGameState = {
  gameId: string;
  status: "upcoming" | "live" | "final";
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  /** Optional minute marker from the feed. Stored for future detectors;
   *  v1 only looks at status. Null when not parseable. */
  minute: number | null;
};

/** Status ranks — once a fixture has moved forward, we treat any
 *  regression as a feed glitch and pin to the higher state. Same logic
 *  the NBA detector uses; without it a transient `live → upcoming`
 *  blip after a brief feed lapse could re-fire kickoff for the same
 *  match once the dedupe TTL expires. */
const STATUS_RANK: Record<FreshWCGameState["status"], number> = {
  upcoming: 0,
  live: 1,
  final: 2,
};

export function detectWCEvents(
  prev: CachedWCGameState | null,
  next: FreshWCGameState
): { events: PushEvent[]; nextState: CachedWCGameState } {
  const stableStatus: FreshWCGameState["status"] =
    prev && STATUS_RANK[prev.status] > STATUS_RANK[next.status]
      ? prev.status
      : next.status;
  const stableNext: FreshWCGameState = { ...next, status: stableStatus };

  const baseInfo = {
    gameId: stableNext.gameId,
    awayCode: stableNext.awayCode,
    homeCode: stableNext.homeCode,
    awayScore: stableNext.awayScore,
    homeScore: stableNext.homeScore,
  };

  const events: PushEvent[] = [];

  // Transition 1: upcoming → live → kickoff.
  // Only on the actual transition. If the cron started after kickoff
  // (no `upcoming` snapshot ever cached) we skip — better to miss a
  // late kickoff push than fan one out 30 minutes after first whistle.
  if (prev?.status === "upcoming" && stableNext.status === "live") {
    events.push({ ...baseInfo, type: "wc-kickoff" });
  }

  // Transition 2: halftime / second half start.
  // Soccer's first half runs minutes 1–45 (plus stoppage). The second
  // half starts at minute 46+. We detect the crossing once: prev minute
  // was ≤ 45 (or null, meaning we hadn't seen a minute yet) and next
  // minute is > 45 while both ticks are live. Also fires when the
  // previous minute was null/0 (first observation of a live game
  // mid-second-half) AS LONG AS prev was already live — so a game that
  // was live at minute 30 and we next see it at minute 48 fires, but a
  // fresh upcoming→live at minute 48 doesn't (that's a kickoff only).
  const halftimeAlreadyFired = prev?.halftimeFired === true;
  let nextHalftimeFired = halftimeAlreadyFired;

  if (
    !halftimeAlreadyFired &&
    prev?.status === "live" &&
    stableNext.status === "live" &&
    stableNext.minute != null &&
    stableNext.minute > 45 &&
    (prev.minute == null || prev.minute <= 45)
  ) {
    events.push({ ...baseInfo, type: "wc-halftime" });
    nextHalftimeFired = true;
  }

  // Goal: the scoreline rose while the match was live. We can't name the
  // scorer from the scoreboard feed (that needs the per-match summary),
  // so the dispatcher renders the new line ("Goal — USA 2, TUR 1"). Only
  // fires when prev was already live, so the first observation of an
  // in-progress match doesn't mint a phantom goal. Penalties / own goals
  // all surface here since they move the scoreline.
  const prevTotal = (prev?.awayScore ?? 0) + (prev?.homeScore ?? 0);
  const nextTotal = stableNext.awayScore + stableNext.homeScore;
  if (
    prev?.status === "live" &&
    stableNext.status === "live" &&
    nextTotal > prevTotal
  ) {
    events.push({ ...baseInfo, type: "wc-goal" });
  }

  // Transition 3: live → final → full time.
  if (prev?.status === "live" && stableNext.status === "final") {
    events.push({ ...baseInfo, type: "wc-final" });
  }

  const nextState: CachedWCGameState = {
    gameId: stableNext.gameId,
    status: stableNext.status,
    awayCode: stableNext.awayCode,
    homeCode: stableNext.homeCode,
    awayScore: stableNext.awayScore,
    homeScore: stableNext.homeScore,
    minute: stableNext.minute,
    halftimeFired: nextHalftimeFired,
    updatedAt: Date.now(),
  };

  return { events, nextState };
}

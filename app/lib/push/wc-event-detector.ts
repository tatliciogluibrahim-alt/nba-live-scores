// World Cup event detector. Compares a freshly-fetched WC fixture state
// with the last cached state and emits zero or more push-worthy events.
// Pure function — caller persists the new state afterwards.
//
// Event taxonomy (v1, deliberately small):
//   • wc-kickoff — status flipped upcoming → live
//   • wc-final   — status flipped live → final
//
// Deferred:
//   • wc-halftime  — needs reliable minute parsing.
//   • wc-goal      — would require diffing penaltyHome/Away + scoreline
//                    minute-by-minute against the feed's event list.
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

  // Transition 2: live → final → full time.
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
    updatedAt: Date.now(),
  };

  return { events, nextState };
}

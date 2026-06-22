// Summer Soccer event detector. Compares a freshly-fetched WC fixture state
// with the last cached state and emits zero or more push-worthy events.
// Pure function — caller persists the new state afterwards.
//
// Event taxonomy (v4):
//   • wc-kickoff     — status flipped upcoming → live
//   • wc-halftime    — the feed reports the halftime break (statusText
//                      matches /ht|half/, surfaced as isHalftime). The
//                      "play has stopped at 45'" moment. Once per game.
//   • wc-second-half — minute crossed from ≤45 to >45 while live: play
//                      has RESUMED. Distinct moment from the break above,
//                      matching the product principle ("halftime AND then
//                      start of second half"). Once per game.
//   • wc-goal        — scoreline rose while live (any goal: open play,
//                      pen, own goal). Carries the scorer name when the
//                      caller threads one in via lastScorer (parsed from
//                      the per-match summary); plain "Goal" otherwise.
//   • wc-final       — status flipped live → final
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
  /** True when the feed reports the halftime break (statusText matches
   *  /ht|half/). Drives the wc-halftime "break" event, distinct from the
   *  minute-crosses-45 "second half resumed" event. Optional: absent is
   *  treated as false by the detector, so callers/tests that predate the
   *  field stay valid. */
  isHalftime?: boolean;
  /** Display name of the most recent goal scorer, parsed from the
   *  per-match summary feed ("Pulisic", or "Name (OG)" for own goals).
   *  The detector attaches it to a wc-goal event so the push can name
   *  the scorer. Absent / null when the feed didn't carry it — the goal
   *  still fires, just without a name. */
  lastScorer?: string | null;
  /** Stage label from the feed ("Round of 32", "Group A"). Passed through
   *  to the event payload for knockout-aware alert copy. Not part of the
   *  cached state or the change-detection — purely decorative on the
   *  event, so it can't affect which events fire. */
  stage?: string;
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
    stage: stableNext.stage,
  };

  const events: PushEvent[] = [];

  // Transition 1: upcoming → live → kickoff.
  // Only on the actual transition. If the cron started after kickoff
  // (no `upcoming` snapshot ever cached) we skip — better to miss a
  // late kickoff push than fan one out 30 minutes after first whistle.
  if (prev?.status === "upcoming" && stableNext.status === "live") {
    events.push({ ...baseInfo, type: "wc-kickoff" });
  }

  // Transition 2a: halftime BREAK. The feed reports the stoppage at 45'
  // (statusText "HT" / "Halftime" → isHalftime). Fires once, only if we
  // saw the match live beforehand (don't fire if the cron first joined
  // mid-break). This is the "play has stopped" moment.
  const halftimeAlreadyFired = prev?.halftimeFired === true;
  let nextHalftimeFired = halftimeAlreadyFired;
  if (
    !halftimeAlreadyFired &&
    prev?.status === "live" &&
    stableNext.status === "live" &&
    stableNext.isHalftime &&
    !prev.isHalftime
  ) {
    events.push({ ...baseInfo, type: "wc-halftime" });
    nextHalftimeFired = true;
  }

  // Transition 2b: second half RESUMED — the first live tick AFTER the
  // halftime break (prev was halftime, now it isn't). Distinct ping from
  // the break above, matching the product principle ("halftime and then
  // start of second half"). Fires once via secondHalfFired.
  //
  // We deliberately key this on the halftime→live transition, NOT on a
  // minute > 45 crossing. The feed represents first-half STOPPAGE time as
  // "45+2", which parseMinute collapses to 47 — a naive minute>45 test
  // would fire "second half" during first-half added time, before the
  // break. The HT-transition signal is stoppage-proof and uses the same
  // halftime detection the lock-screen status line already trusts.
  //
  // Fallback for feeds that never surface "HT" (straight 45+3 → 46'):
  // if we never saw halftime but the clock is clearly in the second half
  // (minute > 50, safely past any plausible first-half stoppage) and we
  // saw the match live before, fire once. 50 not 45 so 45+N stoppage
  // (which tops out well under 50 in practice) can't trip it.
  const secondHalfAlreadyFired = prev?.secondHalfFired === true;
  let nextSecondHalfFired = secondHalfAlreadyFired;
  const cameOutOfHalftime =
    prev?.isHalftime === true && !stableNext.isHalftime;
  const clearlySecondHalf =
    !stableNext.isHalftime &&
    stableNext.minute != null &&
    stableNext.minute > 50;
  if (
    !secondHalfAlreadyFired &&
    prev?.status === "live" &&
    stableNext.status === "live" &&
    (cameOutOfHalftime || clearlySecondHalf)
  ) {
    events.push({ ...baseInfo, type: "wc-second-half" });
    nextSecondHalfFired = true;
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
    events.push({
      ...baseInfo,
      type: "wc-goal",
      ...(stableNext.lastScorer ? { scorer: stableNext.lastScorer } : {}),
    });
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
    isHalftime: stableNext.isHalftime,
    halftimeFired: nextHalftimeFired,
    secondHalfFired: nextSecondHalfFired,
    updatedAt: Date.now(),
  };

  return { events, nextState };
}

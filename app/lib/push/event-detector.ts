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

// Canonical event-type list — the single source of truth. The
// dispatcher, preset matcher, ops-metrics funnel, and the push admin /
// open-tracking routes all derive from this so the taxonomy is defined
// in exactly one place. WC events (wc-kickoff / wc-final, Phase 8 v1)
// carry country ISO codes (USA, BRA, ...) in the same awayCode/homeCode
// slots NBA team abbrs use; the dispatcher branches on the wc- prefix
// to pick a country-follow matcher and a soccer-bespoke payload body.
export const EVENT_TYPES = [
  "tipoff",
  "eoq-1",
  "eoq-2",
  "eoq-3",
  "close-game",
  "comeback",
  "final",
  "wc-kickoff",
  "wc-halftime",
  "wc-goal",
  "wc-final",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

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
  /** True when this is a Game 7 tipoff (NBA only). The dispatcher
   *  uses this to swap in stakes-aware copy ("Game 7 · OKC vs MIN /
   *  Series on the line.") in place of the generic tipoff body.
   *  Tipoff is already in every tier (quiet/companion/all), so this
   *  flag is purely about copy — Quiet users were already going to
   *  get the ping. Fires once per series maximum (same dedupe used
   *  for normal tipoff covers this). */
  isGame7?: boolean;
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
  /** The human-readable status string from /api/live-scores, e.g.
   *  "Q2 · 4:31", "End Q1", "End Q2" (halftime), "End Q3", "Final".
   *  Used by the end-of-quarter detector to fire as soon as the
   *  current quarter wraps, not when the next one starts. */
  statusText: string;
  /** The game context label from the live-scores feed, e.g.
   *  "Game 4", "Game 7". Used to detect Game 7 tipoffs so the
   *  dispatcher can swap in stakes-aware copy (see Phase 21C-G7,
   *  retention playbook). Optional because not every feed carries
   *  it. */
  gameContext?: string;
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

/** Parse the live-scores statusText for an end-of-quarter marker.
 *  Returns 1, 2, or 3 when the current quarter has wrapped (statusText
 *  reads "End Q1", "End Q2" which the live-scores route uses for
 *  halftime, or "End Q3"). Returns null otherwise (in-progress,
 *  upcoming, final, Q4 wrapping → final, OT). We deliberately don't
 *  fire on End Q4 because that's the "final" event's territory. */
function parseEndOfQuarterFromStatus(statusText: string): 1 | 2 | 3 | null {
  const trimmed = statusText.trim();
  if (trimmed === "End Q1") return 1;
  if (trimmed === "End Q2") return 2;
  if (trimmed === "End Q3") return 3;
  return null;
}

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

  // Period guard. The upstream NBA feed occasionally blips
  // (period briefly jumps multiple quarters, or reverts after a
  // game-state UI bug). Either case can mint a wrong end-of-quarter
  // push and — worse — lock the cached period above the true value,
  // suppressing every subsequent legitimate eoq event for the game.
  //
  // Rules:
  //   • period regressed (next < prev): pin period to prev, do not
  //     emit eoq events from this tick.
  //   • period jumped by more than 1 in a single live→live tick: same
  //     treatment. A 5-minute cron interval should never see a jump
  //     > 1 in real play; this is a feed glitch, not a fast game.
  //   • period unchanged or +1: trust the feed, emit normally.
  //
  // We log the skip reason so production scans can be inspected for
  // upstream flakiness. We never log subscription identifiers.
  const prevPeriod = prev?.period ?? 0;
  const periodDelta = next.period - prevPeriod;
  const liveToLive =
    prev?.status === "live" && stableStatus === "live";
  const periodSuspicious = liveToLive && (periodDelta < 0 || periodDelta > 1);
  const stablePeriod = periodSuspicious ? prevPeriod : next.period;

  if (periodSuspicious) {
    console.warn("event-detector: skipping suspicious period transition", {
      gameId: next.gameId,
      prevPeriod,
      feedPeriod: next.period,
      delta: periodDelta,
      reason: periodDelta < 0 ? "regression" : "jump>1",
    });
  }

  const stableNext: FreshGameState = {
    ...next,
    status: stableStatus,
    period: stablePeriod,
  };

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
    // Detect Game 7 from the gameContext label. ESPN labels playoff
    // games as "Game 1" … "Game 7" — when we see Game 7, set the
    // isGame7 flag so the dispatcher swaps in stakes-aware copy
    // ("Game 7 · OKC vs MIN / Series on the line.") rather than the
    // generic tipoff body. Tipoff is already in every tier so Quiet
    // followers already get pinged; this is purely about the words.
    const isGame7 = /\bGame\s*7\b/i.test(next.gameContext ?? "");
    events.push({
      ...baseInfo,
      type: "tipoff",
      ...(isGame7 ? { isGame7: true } : {}),
    });
  }

  // End-of-quarter dedupe flags. Both detection paths below consult
  // and update these so a quarter never fires twice. Pre-existing
  // cache entries from before this field was added read as undefined,
  // treated as false.
  const eoq1AlreadyFired = prev?.eoq1Fired === true;
  const eoq2AlreadyFired = prev?.eoq2Fired === true;
  const eoq3AlreadyFired = prev?.eoq3Fired === true;
  let nextEoq1Fired = eoq1AlreadyFired;
  let nextEoq2Fired = eoq2AlreadyFired;
  let nextEoq3Fired = eoq3AlreadyFired;

  // Transition 2a: live game, statusText reports the current quarter
  // just wrapped. Fires the moment the clock hits 0:00 (and through
  // halftime for "End Q2"). This is the user-expected timing — "tell
  // me when the quarter ends," not "tell me when the next quarter
  // starts." The previous tick must also have been live (we don't
  // mint eoq events on the very first observation of a game).
  if (prev?.status === "live" && next.status === "live") {
    const eoqFromStatus = parseEndOfQuarterFromStatus(next.statusText);
    if (eoqFromStatus === 1 && !eoq1AlreadyFired) {
      events.push({ ...baseInfo, type: "eoq-1" });
      nextEoq1Fired = true;
    } else if (eoqFromStatus === 2 && !eoq2AlreadyFired) {
      events.push({ ...baseInfo, type: "eoq-2" });
      nextEoq2Fired = true;
    } else if (eoqFromStatus === 3 && !eoq3AlreadyFired) {
      events.push({ ...baseInfo, type: "eoq-3" });
      nextEoq3Fired = true;
    }
  }

  // Transition 2b: live game, period incremented by exactly +1
  // (1→2, 2→3, 3→4). The strict equality blocks the multi-period
  // jump case (e.g. 2→4) from minting a single wrong eoq event —
  // upstream blips of that shape are routed through the period-
  // suspicious branch above and don't reach here.
  //
  // This is the fallback path. The cron runs every ~5 minutes and
  // the "End Qn" window is only ~2-3 minutes between Q1 and Q2 (and
  // similar between Q3 and Q4), so we may miss that observation tick
  // and only see the period-increment afterwards. In that case 2a
  // didn't fire and 2b mints the event. The dedupe flags guarantee
  // we never fire eoq-N twice no matter which path triggered first.
  if (
    prev?.status === "live" &&
    next.status === "live" &&
    next.period === prevPeriod + 1 &&
    next.period >= 2 &&
    next.period <= 4
  ) {
    const justEnded = next.period - 1;
    if (justEnded === 1 && !nextEoq1Fired) {
      events.push({ ...baseInfo, type: "eoq-1" });
      nextEoq1Fired = true;
    } else if (justEnded === 2 && !nextEoq2Fired) {
      events.push({ ...baseInfo, type: "eoq-2" });
      nextEoq2Fired = true;
    } else if (justEnded === 3 && !nextEoq3Fired) {
      events.push({ ...baseInfo, type: "eoq-3" });
      nextEoq3Fired = true;
    }
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
    eoq1Fired: nextEoq1Fired,
    eoq2Fired: nextEoq2Fired,
    eoq3Fired: nextEoq3Fired,
    updatedAt: Date.now(),
  };

  return { events, nextState };
}

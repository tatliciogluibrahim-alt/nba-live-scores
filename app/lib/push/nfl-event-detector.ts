// NFL game-state detector (Phase 22 gate 4). Compares a freshly-fetched
// game state with the last cached state and emits zero or more push events.
// Pure — the caller persists the new state. Mirrors the NBA detector's
// shape (status-rank pin + period-guard + once-per-game fired flags),
// applied to football's quarters.
//
// Event taxonomy (game-state family):
//   • nfl-kickoff   — status upcoming → live
//   • nfl-eoq-1     — period 1 → 2
//   • nfl-halftime  — period 2 → 3
//   • nfl-eoq-3     — period 3 → 4
//   • nfl-ot        — period reaches 5 (overtime)
//   • nfl-final     — status live → final
//
// Per-play events (TDs, FGs, big plays) live in nfl-play-detector — they
// need the summary feed, not the scoreboard state this file diffs.

import type { PushEvent } from "./event-detector";
import { scoreEvent } from "./significance";

export type CachedNFLGameState = {
  gameId: string;
  status: "upcoming" | "live" | "final";
  period: number;
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  /** Once-per-game guards so a quarter break never double-fires across the
   *  cron's overlapping ticks. */
  eoq1Fired?: boolean;
  halftimeFired?: boolean;
  eoq3Fired?: boolean;
  otFired?: boolean;
  updatedAt: number;
};

export type FreshNFLGameState = {
  gameId: string;
  status: "upcoming" | "live" | "final";
  period: number;
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
};

// Once a game moves forward along this axis, treat any regression as a feed
// glitch and pin forward (same guard the NBA/WC detectors use — a transient
// live→upcoming blip must never re-fire kickoff after the dedupe TTL).
const STATUS_RANK: Record<FreshNFLGameState["status"], number> = {
  upcoming: 0,
  live: 1,
  final: 2,
};

export function detectNFLEvents(
  prev: CachedNFLGameState | null,
  next: FreshNFLGameState
): { events: PushEvent[]; nextState: CachedNFLGameState } {
  // Monotonic status.
  const status: FreshNFLGameState["status"] =
    prev && STATUS_RANK[prev.status] > STATUS_RANK[next.status]
      ? prev.status
      : next.status;
  // Monotonic period — a backward period is a glitch; hold the higher.
  const period = prev ? Math.max(prev.period, next.period) : next.period;

  const base = {
    gameId: next.gameId,
    awayCode: next.awayCode,
    homeCode: next.homeCode,
    awayScore: next.awayScore,
    homeScore: next.homeScore,
  };
  const events: PushEvent[] = [];
  const withScore = (type: PushEvent["type"]): PushEvent => ({
    ...base,
    type,
    significance: scoreEvent({ type }),
  });

  // Kickoff — only on the real upcoming→live transition. If we never saw the
  // upcoming state (cron joined mid-game), don't fire a late kickoff.
  if (prev?.status === "upcoming" && status === "live") {
    events.push(withScore("nfl-kickoff"));
  }

  // Quarter breaks + OT — fire once each, only when the period actually
  // CROSSES the boundary (prevPeriod < N <= period). We deliberately do NOT
  // backfill a missed break: a late "End of Q1" when the cron rejoins at
  // halftime is noise, not signal. prev must have been live (no minting on
  // the first observation of a game).
  const liveToLive = prev?.status === "live" && status === "live";
  const prevPeriod = prev?.period ?? 0;
  let eoq1Fired = prev?.eoq1Fired ?? false;
  let halftimeFired = prev?.halftimeFired ?? false;
  let eoq3Fired = prev?.eoq3Fired ?? false;
  let otFired = prev?.otFired ?? false;
  const crossed = (n: number) => prevPeriod < n && period >= n;

  if (liveToLive) {
    if (!eoq1Fired && crossed(2)) {
      events.push(withScore("nfl-eoq-1"));
      eoq1Fired = true;
    }
    if (!halftimeFired && crossed(3)) {
      events.push(withScore("nfl-halftime"));
      halftimeFired = true;
    }
    if (!eoq3Fired && crossed(4)) {
      events.push(withScore("nfl-eoq-3"));
      eoq3Fired = true;
    }
    if (!otFired && crossed(5)) {
      events.push(withScore("nfl-ot"));
      otFired = true;
    }
  }

  // Final — live → final.
  if (prev?.status === "live" && status === "final") {
    events.push(withScore("nfl-final"));
  }

  const nextState: CachedNFLGameState = {
    gameId: next.gameId,
    status,
    period,
    awayCode: next.awayCode,
    homeCode: next.homeCode,
    awayScore: next.awayScore,
    homeScore: next.homeScore,
    eoq1Fired,
    halftimeFired,
    eoq3Fired,
    otFired,
    updatedAt: Date.now(),
  };

  return { events, nextState };
}

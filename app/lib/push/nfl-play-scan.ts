// Per-game NFL play scan — the decision scan-nfl makes for one live game on
// one tick, given that game's summary slice and its fired-play set. Pure:
// the route does the fetch and the KV reads/writes, this decides what fires.
// Extracted 2026-09-28 so the replay lab (app/lib/push/replay) runs the
// exact production code instead of a copy of it.

import type { PushEvent } from "./event-detector";
import {
  detectNFLPlays,
  type NFLPlayInput,
} from "./nfl-play-detector";

export type NFLPlayScanInput = NFLPlayInput & {
  /** True when the play scanner has never completed a scan of this game
   *  (no fired-play record exists). Only then can an empty fired set plus
   *  a scoring backlog mean "joined mid-game". */
  firstObservation: boolean;
};

export type NFLPlayScanResult = {
  /** "seeded" = cold start: persist `firedPlayIds`, fire nothing.
   *  "detected" = normal tick: persist `firedPlayIds` when events fired. */
  kind: "seeded" | "detected";
  events: PushEvent[];
  firedPlayIds: string[];
};

export function scanNFLGamePlays(input: NFLPlayScanInput): NFLPlayScanResult {
  // Cold-start seed (Preseason Review #3): when the scheduler first sees a
  // game that is already under way, every past score would burst out as a
  // stale push at once. Seed the set silently and fire from the NEXT play.
  //
  // Gated on firstObservation (2026-09-28): an empty fired set with a
  // scoring backlog is ALSO what a game the scanner has watched since
  // kickoff looks like at its first score. Without the gate the opening
  // score of 30 of 47 games (Weeks 1-3) was seeded instead of pushed.
  // The route derives it from the fired-play record's existence, not from
  // the state cache: a mid-game join whose first summary fetch fails still
  // seeds on the next tick instead of bursting the backlog.
  if (
    input.firstObservation &&
    input.firedPlayIds.length === 0 &&
    input.scoringPlays.length > 0
  ) {
    return {
      kind: "seeded",
      events: [],
      firedPlayIds: input.scoringPlays
        .map((sp) => sp.id)
        .filter((id): id is string => Boolean(id)),
    };
  }
  const result = detectNFLPlays(input);
  return {
    kind: "detected",
    events: result.events,
    firedPlayIds: result.firedPlayIds,
  };
}

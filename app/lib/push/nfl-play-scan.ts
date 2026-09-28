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

export type NFLPlayScanResult = {
  /** "seeded" = cold start: persist `firedPlayIds`, fire nothing.
   *  "detected" = normal tick: persist `firedPlayIds` when events fired. */
  kind: "seeded" | "detected";
  events: PushEvent[];
  firedPlayIds: string[];
};

export function scanNFLGamePlays(input: NFLPlayInput): NFLPlayScanResult {
  // Cold-start seed (Preseason Review #3): an empty fired-set on a game
  // that already has a scoring backlog means the scheduler was (re)enabled
  // mid-game — every past play would burst out as stale pushes at once.
  // Seed the set silently and fire only from the NEXT play onward.
  if (input.firedPlayIds.length === 0 && input.scoringPlays.length > 0) {
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

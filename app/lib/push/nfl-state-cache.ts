// Per-NFL-game state cache — parallel to the NBA/WC caches, its own KV
// prefix so no sport stomps another's keys. The scan cron compares "the
// last state we saw" with the fresh scoreboard to detect game-state
// transitions worth pushing (kickoff, quarter breaks, OT, final).
//
// TTL 3 days: long enough for a game to ride the cron's window from
// kickoff to final + grace, short enough that finished games don't accrete.

import { kv } from "@vercel/kv";
import type { CachedNFLGameState } from "./nfl-event-detector";

const STATE_KEY_PREFIX = "nns:nfl:game-state:v1:";
const STATE_TTL_SECONDS = 3 * 24 * 60 * 60;

function stateKey(gameId: string): string {
  return `${STATE_KEY_PREFIX}${gameId}`;
}

export async function readCachedNFLState(
  gameId: string
): Promise<CachedNFLGameState | null> {
  return (await kv.get<CachedNFLGameState>(stateKey(gameId))) ?? null;
}

export async function writeCachedNFLState(
  state: CachedNFLGameState
): Promise<void> {
  await kv.set(stateKey(state.gameId), state, { ex: STATE_TTL_SECONDS });
}

/** True when a fresh state differs from the cached one in a way the
 *  detector could act on — lets the cron skip a no-op KV write on a quiet
 *  tick (score/period/status unchanged). Mirrors nbaStateChanged. */
export function nflStateChanged(
  prev: CachedNFLGameState | null,
  next: { status: string; period: number; awayScore: number; homeScore: number }
): boolean {
  if (!prev) return true;
  return (
    prev.status !== next.status ||
    prev.period !== next.period ||
    prev.awayScore !== next.awayScore ||
    prev.homeScore !== next.homeScore
  );
}

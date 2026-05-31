// Per-WC-game state cache — parallel to the NBA state cache, separate KV
// prefix so neither sport can stomp the other's keys. The dispatcher
// compares "the last state we saw" with "the state we just fetched" to
// detect tournament transitions worth pushing about (kickoff, final).
//
// TTL is 14 days — long enough for a group-stage match to ride out the
// gap between fixture days, short enough that old matches don't accrete
// in KV after the tournament wraps.

import { kv } from "@vercel/kv";

const STATE_KEY_PREFIX = "nns:wc:game-state:v1:";
const STATE_TTL_SECONDS = 14 * 24 * 60 * 60;

export type CachedWCGameState = {
  gameId: string;
  status: "upcoming" | "live" | "final";
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  /** Best-effort minute marker from the feed (e.g. "45+2" → 47). Used
   *  by the halftime detector to fire when the second half starts. */
  minute: number | null;
  /** Whether the last observed tick was the halftime break. Lets the
   *  detector fire wc-halftime only on the false→true crossing. */
  isHalftime?: boolean;
  /** True once the wc-halftime (break) event has fired for this game. */
  halftimeFired?: boolean;
  /** True once the wc-second-half (resume, minute crosses 45) event has
   *  fired. Distinct from halftimeFired so both moments ping once each. */
  secondHalfFired?: boolean;
  updatedAt: number;
};

function stateKey(gameId: string): string {
  return `${STATE_KEY_PREFIX}${gameId}`;
}

export async function readCachedWCState(
  gameId: string
): Promise<CachedWCGameState | null> {
  const value = await kv.get<CachedWCGameState>(stateKey(gameId));
  return value ?? null;
}

export async function writeCachedWCState(
  state: CachedWCGameState
): Promise<void> {
  await kv.set(stateKey(state.gameId), state, { ex: STATE_TTL_SECONDS });
}

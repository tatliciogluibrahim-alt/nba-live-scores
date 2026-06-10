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

/** True when the meaningful state changed and a write is worth a KV
 *  command. Deliberately ignores `minute` (it ticks up every poll) and
 *  `updatedAt`. Skipping the write during a quiet live stretch leaves a
 *  slightly stale stored `minute`, which is fine: the detector compares
 *  the fresh feed minute against the last WRITTEN one, so a 45'-crossing
 *  (second half) still fires the moment the feed reports it — it just
 *  compares against an older baseline. Goals are score changes (caught
 *  here); halftime is the isHalftime flag (caught here). */
export function wcStateChanged(
  prev: CachedWCGameState | null,
  next: CachedWCGameState
): boolean {
  if (!prev) return true;
  return (
    prev.status !== next.status ||
    prev.awayScore !== next.awayScore ||
    prev.homeScore !== next.homeScore ||
    !!prev.isHalftime !== !!next.isHalftime ||
    !!prev.halftimeFired !== !!next.halftimeFired ||
    !!prev.secondHalfFired !== !!next.secondHalfFired
  );
}

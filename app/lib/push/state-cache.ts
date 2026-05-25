// Per-game state cache. The dispatcher compares "the last state we
// saw" with "the state we just fetched" to detect transitions worth
// pushing about (tipoff, end of quarter, final, close-game).
//
// Backed by Vercel KV. Each entry has a 6-hour TTL because games end
// within ~4 hours and we want stale cache entries to drop off so old
// finals don't reappear in the diff stream after a 24-hour gap.

import { kv } from "@vercel/kv";

const STATE_KEY_PREFIX = "nns:nba:game-state:v1:";
const STATE_TTL_SECONDS = 6 * 60 * 60;

export type CachedGameState = {
  gameId: string;
  status: "upcoming" | "live" | "final";
  period: number;
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  /** Max lead seen so far in the game (absolute). Used by close-game
   *  and comeback detection. Persisted across cron ticks. */
  maxLead: number;
  /** Whether we've already fired a close-game push for this game.
   *  Once true, never fires again for this game. */
  closeGameFired: boolean;
  /** Whether we've already fired a comeback push for this game.
   *  Once true, never fires again for this game. */
  comebackFired: boolean;
  updatedAt: number;
};

function stateKey(gameId: string): string {
  return `${STATE_KEY_PREFIX}${gameId}`;
}

export async function readCachedState(
  gameId: string
): Promise<CachedGameState | null> {
  const value = await kv.get<CachedGameState>(stateKey(gameId));
  return value ?? null;
}

export async function writeCachedState(state: CachedGameState): Promise<void> {
  await kv.set(stateKey(state.gameId), state, { ex: STATE_TTL_SECONDS });
}

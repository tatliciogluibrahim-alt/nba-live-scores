// Per-game fired-NFL-play tracking. Stores which play ids we've already
// pushed (scoring plays + big plays/turnovers) so the scan never
// double-pings a play across overlapping cron ticks. 6-hour TTL — a game
// is long over by then. Mirrors highlight-state-cache.

import { kv } from "@vercel/kv";

const TTL_SECONDS = 6 * 60 * 60;
const key = (gameId: string) => `nns:nfl:plays:v1:${gameId}`;

export async function readFiredNFLPlays(gameId: string): Promise<string[]> {
  return (await kv.get<string[]>(key(gameId))) ?? [];
}

export async function writeFiredNFLPlays(
  gameId: string,
  firedPlayIds: string[]
): Promise<void> {
  await kv.set(key(gameId), firedPlayIds, { ex: TTL_SECONDS });
}

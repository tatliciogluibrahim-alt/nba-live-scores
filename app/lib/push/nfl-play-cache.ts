// Per-game fired-NFL-play tracking. Stores which play ids we've already
// pushed (scoring plays + big plays/turnovers) so the scan never
// double-pings a play across overlapping cron ticks. 6-hour TTL — a game
// is long over by then. Mirrors highlight-state-cache.

import { kv } from "@vercel/kv";

const TTL_SECONDS = 6 * 60 * 60;
const key = (gameId: string) => `nns:nfl:plays:v1:${gameId}`;

/** The play ids already pushed for this game, or null when the play
 *  scanner has never completed a scan of it (no record at all). The null
 *  is what tells a cold start (cron joined a game already under way) apart
 *  from a watched game that simply has not fired anything yet. */
export async function readFiredNFLPlays(gameId: string): Promise<string[] | null> {
  return (await kv.get<string[]>(key(gameId))) ?? null;
}

export async function writeFiredNFLPlays(
  gameId: string,
  firedPlayIds: string[]
): Promise<void> {
  await kv.set(key(gameId), firedPlayIds, { ex: TTL_SECONDS });
}

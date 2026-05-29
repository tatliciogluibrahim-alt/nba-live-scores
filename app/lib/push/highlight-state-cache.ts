// Per-game fired-highlight tracking. Stores which player point
// milestones we've already pushed for a game so the scan never
// double-pings the same threshold. 6-hour TTL (a game is long over by
// then), matching the other push state caches.

import { kv } from "@vercel/kv";

const TTL_SECONDS = 6 * 60 * 60;
const key = (gameId: string) => `nns:push:hl:${gameId}`;

export async function readFiredHighlights(gameId: string): Promise<string[]> {
  return (await kv.get<string[]>(key(gameId))) ?? [];
}

export async function writeFiredHighlights(
  gameId: string,
  firedKeys: string[]
): Promise<void> {
  await kv.set(key(gameId), firedKeys, { ex: TTL_SECONDS });
}

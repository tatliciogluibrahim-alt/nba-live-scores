import { kv } from "@vercel/kv";

// Per-game narrative cache. A validated line is generated at most once
// per game and reused across cron runs and admin previews, so we never
// pay for (or risk drift from) regenerating the same recap. Only
// validated lines are cached; failures are not, so they retry next run.
//
// This is the one infra file in the narrative package — the pure core
// (types / significance / validate / generate) never imports it, which
// keeps that core extractable into a standalone service later.

const KEY_PREFIX = "nns:narrative:v1:";
// 60 days, matching the game-snapshot TTL — a recap is useful exactly as
// long as the game it describes is reachable.
const TTL_SECONDS = 60 * 24 * 60 * 60;

// gameId is interpolated into the key string, so the @vercel/kv
// numeric-string coercion gotcha (which only affects set MEMBERS) does
// not apply here.
function cacheKey(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`;
}

export type CachedNarrative = {
  text: string;
  createdAt: number;
  signal: string;
};

export async function readCachedNarrative(
  gameId: string
): Promise<CachedNarrative | null> {
  try {
    return (await kv.get<CachedNarrative>(cacheKey(gameId))) ?? null;
  } catch {
    return null;
  }
}

export async function writeCachedNarrative(
  gameId: string,
  value: CachedNarrative
): Promise<void> {
  try {
    await kv.set(cacheKey(gameId), value, { ex: TTL_SECONDS });
  } catch {
    /* best-effort: a cache miss next time is harmless */
  }
}

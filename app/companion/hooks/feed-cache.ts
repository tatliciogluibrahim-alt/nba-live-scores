// Seed-only in-memory feed cache.
//
// The Today / Watching tabs are separate routes, so navigating between
// them unmounts the data hook and refetches the shared feeds
// (/api/live-scores, the Summer Soccer feed) from scratch — a visible
// empty-shell flash on every hop, on data both tabs share.
//
// This cache fixes the flash WITHOUT touching the polling/freshness
// model: every successful fetch writes its raw result here, and a hook
// SEEDS its initial state from the cache on mount (so the tab paints
// immediately with the last-known feed). The poll then refreshes within
// its normal interval. The cache is never read by the poller itself, so
// live data is never served stale to the live loop.
//
// `maxAgeMs` guards against seeding very old data onto a tab opened after
// a long idle — past that, the hook cold-loads (loading shell) as before.
// In-memory + module-scoped: dies on full reload, which is correct (a
// fresh page load should fetch fresh).

type CacheEntry = { value: unknown; at: number; maxAgeMs?: number };

const store = new Map<string, CacheEntry>();

const DEFAULT_MAX_AGE_MS = 45_000;

/** Stable keys shared across hooks so Today and Watching reuse the same
 *  raw feed. */
export const FEED_KEYS = {
  liveScores: "feed:live-scores",
  worldCup: "feed:world-cup",
  nfl: "feed:nfl-scores",
} as const;

/** `maxAgeMs` lets a writer on a slow cadence (a sport the user doesn't
 *  follow, refreshed every few minutes) keep its entry seedable that long. */
export function writeFeed<T>(key: string, value: T, maxAgeMs?: number): void {
  store.set(key, { value, at: Date.now(), maxAgeMs });
}

/** Returns the cached value if present and fresher than maxAgeMs (the
 *  reader's, else the writer's, else the default), otherwise undefined. */
export function readFeed<T>(key: string, maxAgeMs?: number): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  const limit = maxAgeMs ?? entry.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  if (Date.now() - entry.at > limit) return undefined;
  return entry.value as T;
}

/** The three shared feeds for a tab's seed, or nothing. A tab paints from
 *  the cache only when EVERY feed is there: seeding NBA + Summer Soccer
 *  while NFL had no entry made Watching show every tracked NFL game as
 *  "This game isn't in the live feed" (with a Remove button) and dropped
 *  Today's NFL lead until the next poll (persona sweep, 2026-10-11).
 *  Missing any one, the hook cold-loads behind its loading shell. */
export function readSeedFeeds<L = unknown, W = unknown, N = unknown>():
  | { liveScores: L; worldCup: W; nfl: N }
  | undefined {
  const liveScores = readFeed<L>(FEED_KEYS.liveScores);
  const worldCup = readFeed<W>(FEED_KEYS.worldCup);
  const nfl = readFeed<N>(FEED_KEYS.nfl);
  if (liveScores === undefined || worldCup === undefined || nfl === undefined) {
    return undefined;
  }
  return { liveScores, worldCup, nfl };
}

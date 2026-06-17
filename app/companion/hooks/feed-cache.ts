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

type CacheEntry = { value: unknown; at: number };

const store = new Map<string, CacheEntry>();

const DEFAULT_MAX_AGE_MS = 45_000;

/** Stable keys shared across hooks so Today and Watching reuse the same
 *  raw feed. */
export const FEED_KEYS = {
  liveScores: "feed:live-scores",
  worldCup: "feed:world-cup",
} as const;

export function writeFeed<T>(key: string, value: T): void {
  store.set(key, { value, at: Date.now() });
}

/** Returns the cached value if present and fresher than maxAgeMs,
 *  otherwise undefined. */
export function readFeed<T>(
  key: string,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > maxAgeMs) return undefined;
  return entry.value as T;
}

// Poll cadence per feed. Every page used to fetch NFL, NBA and Summer
// Soccer on every tick (10s while anything was live), whatever the user
// follows (persona sweep, 2026-10-11). A sport the user follows, or tracks a
// game in, stays on the tick. Any other sport refreshes every SLOW_FEED_MS:
// Today never shows its games, but the seed cache and Watching's stale-pin
// check still read the feed, so it stays warm.
//
// NFL is the in-season feed and is fetched on every tick by the callers.

export const SLOW_FEED_MS = 5 * 60_000;

/** How long a slow-cadence feed stays seedable in the shared cache. */
export const SLOW_FEED_CACHE_MS = SLOW_FEED_MS + 60_000;

/** Which non-NFL feeds to fetch on this tick. `sports` is the set of sports
 *  the user follows or tracks, or null when that isn't known yet (follows
 *  still hydrating, or a tracked game whose sport isn't known), in which
 *  case everything is fetched. */
export function feedsDue({
  sports,
  lastFetched,
  now,
  slowMs = SLOW_FEED_MS,
}: {
  sports: ReadonlySet<string> | null;
  lastFetched: { nba: number; wc: number };
  now: number;
  slowMs?: number;
}): { nba: boolean; wc: boolean } {
  const due = (sport: "nba" | "wc") =>
    sports === null || sports.has(sport) || now - lastFetched[sport] >= slowMs;
  return { nba: due("nba"), wc: due("wc") };
}

/** The sports a screen needs fresh: the follows' sports, when every tracked
 *  game is placed in the NFL feed. Null (fetch everything) while follows or
 *  tracked games are still loading, for someone who follows nothing yet
 *  (Today shows them the live slate), or when a tracked game sits in no
 *  known feed and so could be NBA or Summer Soccer. */
export function interestSports({
  hydrated,
  followSports,
  pinnedIds,
  nflIds,
}: {
  hydrated: boolean;
  followSports: readonly (string | null)[];
  pinnedIds: readonly string[];
  nflIds: ReadonlySet<string>;
}): ReadonlySet<string> | null {
  if (!hydrated || followSports.length === 0) return null;
  if (pinnedIds.some((id) => !nflIds.has(id))) return null;
  return new Set(followSports.filter((s): s is string => Boolean(s)));
}

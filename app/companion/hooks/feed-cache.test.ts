import { describe, it, expect, beforeEach, vi } from "vitest";

// The seed a tab paints before its first poll. Watching (and Today's NFL
// lead) used to seed from NBA + Summer Soccer while NFL had no cache entry,
// so every tracked NFL game read "This game isn't in the live feed" with a
// Remove button until the NFL poll landed (persona sweep, 2026-10-11).

type FeedCache = typeof import("./feed-cache");
let cache: FeedCache;

beforeEach(async () => {
  vi.resetModules();
  cache = await import("./feed-cache");
});

describe("readSeedFeeds", () => {
  it("returns nothing while NFL is not cached, even with the other feeds there", () => {
    cache.writeFeed(cache.FEED_KEYS.liveScores, { games: [], recent: [] });
    cache.writeFeed(cache.FEED_KEYS.worldCup, []);
    expect(cache.readSeedFeeds()).toBeUndefined();
  });

  it("returns all three once every feed is cached", () => {
    const nfl = [{ id: "401872982" }];
    cache.writeFeed(cache.FEED_KEYS.liveScores, { games: [], recent: [] });
    cache.writeFeed(cache.FEED_KEYS.worldCup, []);
    cache.writeFeed(cache.FEED_KEYS.nfl, nfl);
    expect(cache.readSeedFeeds()).toEqual({
      liveScores: { games: [], recent: [] },
      worldCup: [],
      nfl,
    });
  });

  it("treats an expired entry as missing", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-11T17:00:00Z"));
      cache.writeFeed(cache.FEED_KEYS.liveScores, { games: [], recent: [] });
      cache.writeFeed(cache.FEED_KEYS.worldCup, []);
      cache.writeFeed(cache.FEED_KEYS.nfl, []);
      vi.setSystemTime(new Date("2026-10-11T17:01:00Z")); // past the 45s window
      expect(cache.readSeedFeeds()).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

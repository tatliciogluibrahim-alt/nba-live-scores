import { describe, it, expect } from "vitest";
import { feedsDue, interestSports, SLOW_FEED_MS } from "./feed-cadence";

// Persona sweep 2026-10-11: every page polled NFL, NBA and Summer Soccer
// every 10s, whatever the user follows. A sport the user follows (or
// tracks a game in) stays on the live cadence. Any other sport refreshes
// every SLOW_FEED_MS, which keeps the seed cache warm without the noise.

const NOW = 1_000_000_000;

describe("feedsDue", () => {
  it("fetches everything on the first load", () => {
    expect(feedsDue({ sports: new Set(["nfl"]), lastFetched: { nba: 0, wc: 0 }, now: NOW })).toEqual({
      nba: true,
      wc: true,
    });
  });

  it("skips sports the user doesn't follow until the slow window passes", () => {
    const last = { nba: NOW - 60_000, wc: NOW - 60_000 };
    expect(feedsDue({ sports: new Set(["nfl"]), lastFetched: last, now: NOW })).toEqual({
      nba: false,
      wc: false,
    });
    const stale = { nba: NOW - SLOW_FEED_MS, wc: NOW - SLOW_FEED_MS };
    expect(feedsDue({ sports: new Set(["nfl"]), lastFetched: stale, now: NOW })).toEqual({
      nba: true,
      wc: true,
    });
  });

  it("keeps a followed sport on every tick", () => {
    const last = { nba: NOW - 5_000, wc: NOW - 5_000 };
    expect(feedsDue({ sports: new Set(["nba"]), lastFetched: last, now: NOW })).toEqual({
      nba: true,
      wc: false,
    });
  });

  it("treats unknown interests (follows not loaded yet) as all followed", () => {
    const last = { nba: NOW - 5_000, wc: NOW - 5_000 };
    expect(feedsDue({ sports: null, lastFetched: last, now: NOW })).toEqual({ nba: true, wc: true });
  });
});

describe("interestSports", () => {
  const nflIds = new Set(["401872990", "401872985"]);

  it("is unknown until follows and tracked games have loaded", () => {
    expect(interestSports({ hydrated: false, followSports: ["nfl"], pinnedIds: [], nflIds })).toBeNull();
  });

  it("keeps everything fresh for someone who follows nothing yet", () => {
    expect(interestSports({ hydrated: true, followSports: [], pinnedIds: [], nflIds })).toBeNull();
  });

  it("is unknown while a tracked game isn't in the NFL feed (it could be NBA or Summer Soccer)", () => {
    expect(interestSports({ hydrated: true, followSports: ["nfl"], pinnedIds: ["401859967"], nflIds })).toBeNull();
  });

  it("is the followed sports when every tracked game is placed", () => {
    expect(
      interestSports({ hydrated: true, followSports: ["nfl", "nfl"], pinnedIds: ["401872990"], nflIds })
    ).toEqual(new Set(["nfl"]));
  });
});

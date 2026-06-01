import { describe, it, expect } from "vitest";
import {
  gameMatchIds,
  reminderFollowIds,
  type FeedGame,
} from "./lib";
import type { SyncedAlert } from "../../../lib/push/sync-validation";

// Reminders cron — the matching primitives are the load-bearing
// correctness layer (a wrong gameMatchIds means the wrong people get
// pinged). These tests pin the behavior exactly.

describe("gameMatchIds", () => {
  it("returns both team abbreviations + the series key for a normal NBA game", () => {
    const ids = gameMatchIds({
      id: "g1",
      date: "2026-06-03T20:30:00Z",
      status: "upcoming",
      away: { abbreviation: "OKC" },
      home: { abbreviation: "SA" },
    });
    // Series key is sorted, so OKC-SA → "OKC-SA"
    expect(ids).toEqual(new Set(["OKC", "SA", "OKC-SA"]));
  });

  it("uppercases lowercase abbreviations", () => {
    const ids = gameMatchIds({
      id: "g1",
      date: "2026-06-03T20:30:00Z",
      status: "upcoming",
      away: { abbreviation: "okc" },
      home: { abbreviation: "sa" },
    });
    expect(ids.has("OKC")).toBe(true);
    expect(ids.has("SA")).toBe(true);
  });

  it("returns an empty set when both teams are missing", () => {
    const ids = gameMatchIds({
      id: "g1",
      date: "x",
      status: "upcoming",
    } as FeedGame);
    expect(ids.size).toBe(0);
  });

  it("returns just the away code when home is missing (no series key)", () => {
    const ids = gameMatchIds({
      id: "g1",
      date: "x",
      status: "upcoming",
      away: { abbreviation: "BRA" },
    });
    expect(ids).toEqual(new Set(["BRA"]));
  });
});

describe("reminderFollowIds", () => {
  it("includes team / country / series ids, uppercased", () => {
    const alerts: SyncedAlert[] = [
      { kind: "team", id: "okc", tier: "companion" },
      { kind: "country", id: "BRA", tier: "companion" },
      { kind: "series", id: "OKC-SA", tier: "companion" },
    ];
    expect(reminderFollowIds(alerts)).toEqual(
      new Set(["OKC", "BRA", "OKC-SA"])
    );
  });

  it("EXCLUDES tournament follows (would spam per-game pings)", () => {
    const alerts: SyncedAlert[] = [
      {
        kind: "tournament",
        id: "fifa-world-cup-2026",
        tier: "companion",
      },
      { kind: "team", id: "OKC", tier: "companion" },
    ];
    const ids = reminderFollowIds(alerts);
    expect(ids).toEqual(new Set(["OKC"]));
    expect(ids.has("FIFA-WORLD-CUP-2026")).toBe(false);
  });

  it("returns an empty set when no follows qualify", () => {
    const alerts: SyncedAlert[] = [
      { kind: "tournament", id: "nba-playoffs-2025", tier: "companion" },
    ];
    expect(reminderFollowIds(alerts).size).toBe(0);
  });
});

describe("reminder matching — end-to-end (game ↔ follows intersection)", () => {
  // The cron does: `intersects(gameMatchIds(game), reminderFollowIds(alerts))`.
  // This proves the two primitives compose correctly for the real cases
  // a launch-night reminder would face.
  function matches(game: FeedGame, alerts: SyncedAlert[]): boolean {
    const a = gameMatchIds(game);
    const b = reminderFollowIds(alerts);
    for (const id of a) if (b.has(id)) return true;
    return false;
  }

  const game: FeedGame = {
    id: "g1",
    date: "2026-06-03T20:30:00Z",
    status: "upcoming",
    away: { abbreviation: "OKC" },
    home: { abbreviation: "SA" },
  };

  it("team follow for OKC matches the OKC vs SA game", () => {
    expect(
      matches(game, [{ kind: "team", id: "OKC", tier: "companion" }])
    ).toBe(true);
  });

  it("series follow for OKC-SA matches", () => {
    expect(
      matches(game, [{ kind: "series", id: "OKC-SA", tier: "companion" }])
    ).toBe(true);
  });

  it("team follow for NYK does NOT match an OKC vs SA game", () => {
    expect(
      matches(game, [{ kind: "team", id: "NYK", tier: "companion" }])
    ).toBe(false);
  });

  it("tournament follow does NOT match (excluded from reminders by design)", () => {
    expect(
      matches(game, [
        { kind: "tournament", id: "nba-playoffs-2025", tier: "companion" },
      ])
    ).toBe(false);
  });
});

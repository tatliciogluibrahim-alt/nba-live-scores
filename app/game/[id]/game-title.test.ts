import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  FALLBACK_GAME_TITLE,
  gameTitle,
  isGameId,
  matchupFromCaches,
} from "./game-title";

// A real /api/nfl-scores payload (Week 4, captured 2026-10-01). The route
// stores exactly this shape in KV, which the title resolver reads.
const week4 = JSON.parse(
  readFileSync(
    new URL("../../../scripts/fixtures/nfl-week4-2026.json", import.meta.url),
    "utf8"
  )
);
const PIT_AT_CLE = "401872964"; // final, CLE 27 PIT 24

describe("gameTitle", () => {
  it("NFL and NBA read away at home", () => {
    expect(gameTitle({ sport: "nfl", away: "Steelers", home: "Browns" })).toBe(
      "Steelers at Browns | No Noise Scores"
    );
    expect(gameTitle({ sport: "nba", away: "Knicks", home: "Celtics" })).toBe(
      "Knicks at Celtics | No Noise Scores"
    );
  });

  it("Summer Soccer reads like its own match page heading (away vs home)", () => {
    expect(gameTitle({ sport: "wc", away: "South Africa", home: "Mexico" })).toBe(
      "South Africa vs Mexico | No Noise Scores"
    );
  });

  it("falls back to the plain title when either side is unknown", () => {
    expect(gameTitle(null)).toBe(FALLBACK_GAME_TITLE);
    expect(gameTitle({ sport: "nfl", away: "TBD", home: "Browns" })).toBe(
      FALLBACK_GAME_TITLE
    );
    expect(gameTitle({ sport: "nba", away: " ", home: "Celtics" })).toBe(
      FALLBACK_GAME_TITLE
    );
    expect(FALLBACK_GAME_TITLE).toBe("Game | No Noise Scores");
  });
});

describe("matchupFromCaches", () => {
  it("reads the cached NFL scoreboard (nicknames, as the app speaks them)", () => {
    expect(matchupFromCaches(PIT_AT_CLE, { nflScoreboard: week4 })).toEqual({
      sport: "nfl",
      away: "Steelers",
      home: "Browns",
    });
  });

  it("reads the NFL push state when the scoreboard cache has expired", () => {
    const state = {
      gameId: PIT_AT_CLE,
      status: "final",
      awayCode: "PIT",
      homeCode: "CLE",
      awayScore: 24,
      homeScore: 27,
    };
    expect(matchupFromCaches(PIT_AT_CLE, { nflState: state })).toEqual({
      sport: "nfl",
      away: "Steelers",
      home: "Browns",
    });
  });

  it("reads NBA state, snapshot and live payloads", () => {
    const state = { awayCode: "NYK", homeCode: "BOS", awayScore: 101, homeScore: 99 };
    expect(matchupFromCaches("401", { nbaState: state })).toEqual({
      sport: "nba",
      away: "Knicks",
      home: "Celtics",
    });
    const game = {
      id: "402",
      away: { name: "Knicks", abbreviation: "NYK", score: 90 },
      home: { name: "Celtics", abbreviation: "BOS", score: 88 },
    };
    expect(matchupFromCaches("402", { nbaSnapshot: game })).toEqual({
      sport: "nba",
      away: "Knicks",
      home: "Celtics",
    });
    expect(
      matchupFromCaches("402", {
        nbaLive: { payload: { games: [], seriesGames: [game] }, fetchedAt: 1 },
      })
    ).toEqual({ sport: "nba", away: "Knicks", home: "Celtics" });
  });

  it("reads Summer Soccer state and live payloads", () => {
    expect(
      matchupFromCaches("701", { wcState: { awayCode: "RSA", homeCode: "MEX" } })
    ).toEqual({ sport: "wc", away: "South Africa", home: "Mexico" });
    const match = {
      id: "702",
      away: { name: "France", abbreviation: "FRA", score: 1 },
      home: { name: "Spain", abbreviation: "ESP", score: 2 },
    };
    expect(matchupFromCaches("702", { wcLive: { games: [match] } })).toEqual({
      sport: "wc",
      away: "France",
      home: "Spain",
    });
  });

  it("returns null for an id no cache knows", () => {
    expect(matchupFromCaches("999", { nflScoreboard: week4 })).toBeNull();
    expect(matchupFromCaches("999", {})).toBeNull();
  });

  it("never guesses a name for a code outside the directories", () => {
    expect(
      matchupFromCaches("1", { nflState: { awayCode: "AFC", homeCode: "NFC" } })
    ).toBeNull();
  });

  it("never carries a score into the title, whatever the cache holds", () => {
    const title = gameTitle(matchupFromCaches(PIT_AT_CLE, { nflScoreboard: week4 }));
    expect(title).toBe("Steelers at Browns | No Noise Scores");
    expect(title).not.toMatch(/\b(24|27)\b/);
  });
});

describe("isGameId", () => {
  it("accepts ESPN ids and the app's preview ids", () => {
    expect(isGameId("401872964")).toBe(true);
    expect(isGameId("preview-wc-usa-tur")).toBe(true);
  });
  it("rejects anything that is not a plain id", () => {
    expect(isGameId("")).toBe(false);
    expect(isGameId("../admin")).toBe(false);
    expect(isGameId("a".repeat(80))).toBe(false);
    expect(isGameId("401 872")).toBe(false);
  });
});

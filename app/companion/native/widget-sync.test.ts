import { describe, expect, it } from "vitest";
import type { Follow } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";
import type { NBAGame } from "../today/today-data";
import { buildLiveEntries } from "./WidgetSync";

function follow(kind: Follow["kind"], id: string): Follow {
  return legacyRefToFollow(kind, id, {
    alertEnabled: false,
    alertTier: "quiet",
    followedAt: 1,
  })!;
}

function nbaLive(id: string, away: string, home: string): NBAGame {
  return {
    id,
    date: new Date().toISOString(),
    status: "live",
    statusText: "Q3 · 4:21",
    period: 3,
    matchup: `${away} vs ${home}`,
    gameContext: "Game 1",
    seriesSummary: "SERIES TIED 0-0",
    seriesConference: "East",
    seriesRound: "Conference Finals",
    away: { name: away, abbreviation: away, score: 74, logo: "" },
    home: { name: home, abbreviation: home, score: 76, logo: "" },
    broadcasts: [],
  };
}

describe("WidgetSync live follow eligibility", () => {
  const exactSeriesGame = nbaLive("exact", "NYK", "BOS");
  const nextRoundGame = nbaLive("next-round", "BOS", "CLE");

  it("includes only the exact matchup for a series follow", () => {
    const entries = buildLiveEntries(
      [exactSeriesGame, nextRoundGame],
      [],
      [],
      [follow("series", "NYK-BOS")],
      false
    );

    expect(entries.map((entry) => entry.id)).toEqual(["exact"]);
  });

  it("continues to include every matchup for a direct team follow", () => {
    const entries = buildLiveEntries(
      [exactSeriesGame, nextRoundGame],
      [],
      [],
      [follow("team", "BOS")],
      false
    );

    expect(entries.map((entry) => entry.id)).toEqual([
      "exact",
      "next-round",
    ]);
  });
});

// Courtside data-level redaction (spec 2026-08-31): a held score's digits
// never enter the widget App Group snapshot. The snapshot keeps numeric
// placeholder scores because the v1.0.3 Swift decoder requires them (it
// only ever renders them when `redacted` is false), so the real digits are
// replaced, not merely flagged.
describe("WidgetSync held scores stay out of the snapshot", () => {
  const game = nbaLive("held", "NYK", "BOS"); // 74-76, real digits

  it("replaces the real score when No-Spoilers is on", () => {
    const [entry] = buildLiveEntries([game], [], [], [follow("team", "BOS")], true);
    expect(entry.redacted).toBe(true);
    expect(entry.away.score).toBe(0);
    expect(entry.home.score).toBe(0);
    expect(JSON.stringify(entry)).not.toMatch(/74|76/);
  });

  it("keeps the real score when nothing hides the game", () => {
    const [entry] = buildLiveEntries([game], [], [], [follow("team", "BOS")], false);
    expect(entry.redacted).toBe(false);
    expect([entry.away.score, entry.home.score]).toEqual([74, 76]);
  });
});

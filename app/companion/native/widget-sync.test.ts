import { describe, expect, it } from "vitest";
import type { Follow } from "../state/types";
import type { NBAGame } from "../today/today-data";
import { buildLiveEntries } from "./WidgetSync";

function follow(kind: Follow["kind"], id: string): Follow {
  return {
    kind,
    id,
    alertEnabled: false,
    alertTier: "quiet",
    followedAt: 1,
  };
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
      [follow("series", "NYK-BOS")],
      false
    );

    expect(entries.map((entry) => entry.id)).toEqual(["exact"]);
  });

  it("continues to include every matchup for a direct team follow", () => {
    const entries = buildLiveEntries(
      [exactSeriesGame, nextRoundGame],
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

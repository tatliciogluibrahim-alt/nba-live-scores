import { describe, expect, it } from "vitest";
import type { Follow } from "../state/types";
import {
  buildTodayPayload,
  WC_KICKOFF,
  type NBAGame,
  type WCGameLite,
} from "./today-data";

function follow(kind: Follow["kind"], id: string): Follow {
  return {
    kind,
    id,
    alertEnabled: false,
    alertTier: "quiet",
    followedAt: 1,
  };
}

function nbaLive(): NBAGame {
  return {
    id: "nba-live",
    date: new Date().toISOString(),
    status: "live",
    statusText: "Q3 · 4:21",
    period: 3,
    matchup: "LAL vs BOS",
    gameContext: "Game 4",
    seriesSummary: "BOS leads 2-1",
    seriesConference: "Finals",
    seriesRound: "NBA Finals",
    away: {
      name: "Los Angeles Lakers",
      abbreviation: "LAL",
      score: 74,
      logo: "",
    },
    home: {
      name: "Boston Celtics",
      abbreviation: "BOS",
      score: 76,
      logo: "",
    },
    broadcasts: [],
  };
}

function wcLive(): WCGameLite {
  return {
    id: "wc-live",
    date: new Date().toISOString(),
    status: "live",
    statusText: "58'",
    stage: "Group A",
    group: "A",
    away: { name: "United States", abbreviation: "USA", score: 1 },
    home: { name: "Turkey", abbreviation: "TUR", score: 0 },
    broadcasts: [],
    watchLabel: "",
  };
}

describe("Today personal-content contract", () => {
  it("does not promote or count an unrelated live feed game", () => {
    const payload = buildTodayPayload({
      nba: [nbaLive()],
      wc: [],
      follows: [follow("country", "USA")],
      pinned: [],
    });

    expect(payload.hero).toBeNull();
    expect(payload.scoreboard).toEqual([]);
    expect(payload.isQuietDay).toBe(true);
  });

  it("keeps colliding team and country codes inside their sport", () => {
    const portugal = wcLive();
    portugal.away = {
      name: "Portugal",
      abbreviation: "POR",
      score: 1,
    };
    const payload = buildTodayPayload({
      nba: [],
      wc: [portugal],
      follows: [follow("team", "POR")],
      pinned: [],
    });

    expect(payload.hero).toBeNull();
    expect(payload.scoreboard).toEqual([]);
    expect(payload.isQuietDay).toBe(true);
  });

  it("treats series and tournament follows as personal live coverage", () => {
    const seriesPayload = buildTodayPayload({
      nba: [nbaLive()],
      wc: [],
      follows: [follow("series", "LAL-BOS")],
      pinned: [],
    });
    const tournamentPayload = buildTodayPayload({
      nba: [],
      wc: [wcLive()],
      follows: [follow("tournament", "fifa-world-cup-2026")],
      pinned: [],
    });

    expect(seriesPayload.hero?.href).toBe("/game/nba-live?from=today");
    expect(tournamentPayload.hero?.href).toBe("/game/wc-live?from=today");
  });

  it("does not let a stale series follow qualify a next-round matchup", () => {
    const nextRound = nbaLive();
    nextRound.matchup = "BOS vs CLE";
    nextRound.away = {
      name: "Boston Celtics",
      abbreviation: "BOS",
      score: 74,
      logo: "",
    };
    nextRound.home = {
      name: "Cleveland Cavaliers",
      abbreviation: "CLE",
      score: 76,
      logo: "",
    };

    const payload = buildTodayPayload({
      nba: [nextRound],
      wc: [],
      follows: [follow("series", "NYK-BOS")],
      pinned: [],
    });

    expect(payload.hero).toBeNull();
    expect(payload.scoreboard).toEqual([]);
    expect(payload.isQuietDay).toBe(true);
  });

  it("shows the kickoff hero only to a WC country or tournament follower", () => {
    const now = new Date(WC_KICKOFF.getTime() - 60 * 60 * 1000);
    const unrelated = buildTodayPayload({
      nba: [],
      wc: [],
      follows: [follow("team", "BOS")],
      pinned: [],
      now,
    });
    const tournament = buildTodayPayload({
      nba: [],
      wc: [],
      follows: [follow("tournament", "fifa-world-cup-2026")],
      pinned: [],
      now,
    });

    expect(unrelated.hero).toBeNull();
    expect(tournament.hero?.kind).toBe("wc-countdown");
  });
});

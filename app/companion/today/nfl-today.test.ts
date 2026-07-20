import { describe, it, expect } from "vitest";
import { buildTodayPayload } from "./today-data";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import type { NBAGame } from "./today-data";
import type { Follow } from "../state/types";

function nflGame(over: Partial<NFLGameLite> = {}): NFLGameLite {
  return {
    id: "nfl1",
    // ~2h out so it stays on the slate.
    date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: "upcoming",
    statusText: "Upcoming",
    week: 1,
    seasonType: 2,
    period: 0,
    home: { name: "Kansas City Chiefs", abbreviation: "KC", score: 0 },
    away: { name: "Los Angeles Chargers", abbreviation: "LAC", score: 0 },
    broadcasts: ["CBS"],
    ...over,
  };
}

function nflTeamFollow(scopeId: string): Follow {
  return {
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId,
    kind: "team",
    id: scopeId,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  };
}

function nbaTeamFollow(scopeId: string): Follow {
  return {
    momentId: "nba-playoffs-2025",
    scope: "team",
    scopeId,
    kind: "team",
    id: scopeId,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  };
}

const base = { nba: [] as NBAGame[], nbaRecent: [] as NBAGame[], wc: [], pinned: [] };

describe("Today reads NFL games for followed NFL teams", () => {
  it("surfaces a followed NFL team's upcoming game in Up Next", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame()],
      follows: [nflTeamFollow("KC")],
    });
    const nflItems = p.upNext.filter((i) => i.source === "nfl");
    expect(nflItems).toHaveLength(1);
    expect(nflItems[0].headline).toBe("LAC at KC");
    expect(nflItems[0].personal).toBe(true);
  });

  it("collision guard: an NBA 'LAC' follow does NOT match an NFL LAC game", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame()], // LAC (Chargers) at KC
      follows: [nbaTeamFollow("LAC")], // NBA Clippers
    });
    expect(p.upNext.filter((i) => i.source === "nfl")).toHaveLength(0);
  });

  it("an NFL 'LAC' follow DOES match its NFL game", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame()],
      follows: [nflTeamFollow("LAC")],
    });
    expect(p.upNext.filter((i) => i.source === "nfl")).toHaveLength(1);
  });

  it("no NFL follow → no NFL games surface (follows-first)", () => {
    const p = buildTodayPayload({ ...base, nfl: [nflGame()], follows: [] });
    expect(p.upNext.filter((i) => i.source === "nfl")).toHaveLength(0);
  });
});

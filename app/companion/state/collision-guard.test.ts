import { describe, expect, it } from "vitest";
import type { Follow, FollowV2 } from "./types";
import { toFollow } from "./follow-migration";
import {
  teamFollowCodes,
  seriesFollowIds,
  followsWholeSport,
  momentSport,
} from "./moments";
import { followHidesParticipants } from "../spoiler/follow-match";
import { buildNBAFollowCoverage } from "../following/nba-follow-coverage";

// Path B collision class: the derived legacy `id`/`kind` of a Follow cannot
// tell an NFL "CLE" (Browns) from an NBA "CLE" (Cavaliers), and NFL + NBA
// seasons overlap. These tests lock the sport-scoped readers so a follow in
// one sport can never resolve against a game in another. 14 codes collide;
// CLE and LAC are the canonical examples.

function nflTeam(code: string, hideSpoilers = false): Follow {
  const core: FollowV2 = {
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId: code,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
    hideSpoilers,
  };
  return toFollow(core);
}

function nbaTeam(code: string, hideSpoilers = false): Follow {
  const core: FollowV2 = {
    momentId: "nba-playoffs-2025",
    scope: "team",
    scopeId: code,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
    hideSpoilers,
  };
  return toFollow(core);
}

function nflWholeSeason(): Follow {
  return toFollow({
    momentId: "nfl-season-2026",
    scope: "all",
    scopeId: null,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  });
}

describe("momentSport", () => {
  it("resolves the three families, prefix-tolerant", () => {
    expect(momentSport("nba-playoffs-2025")).toBe("nba");
    expect(momentSport("nba-playoffs-2027")).toBe("nba");
    expect(momentSport("fifa-world-cup-2026")).toBe("wc");
    expect(momentSport("nfl-season-2026")).toBe("nfl");
    expect(momentSport("nfl-season-2030")).toBe("nfl");
    expect(momentSport("mystery-league")).toBeNull();
  });
});

describe("teamFollowCodes sport scoping", () => {
  it("returns only the requested sport's codes when codes collide", () => {
    const follows = [nflTeam("CLE"), nbaTeam("LAC")];
    expect(teamFollowCodes(follows, "nba")).toEqual(new Set(["LAC"]));
    expect(teamFollowCodes(follows, "nfl")).toEqual(new Set(["CLE"]));
  });

  it("keeps two same-code follows apart by sport", () => {
    // A user who follows the Browns (NFL) and the Cavaliers (NBA) — both CLE.
    const follows = [nflTeam("CLE"), nbaTeam("CLE")];
    expect(teamFollowCodes(follows, "nba")).toEqual(new Set(["CLE"]));
    expect(teamFollowCodes(follows, "nfl")).toEqual(new Set(["CLE"]));
    // But the NBA reader must not see the NFL follow as an extra code, and
    // vice versa — each set has exactly one entry, not a merged two.
    expect(teamFollowCodes(follows, "nba").size).toBe(1);
    expect(teamFollowCodes(follows, "nfl").size).toBe(1);
  });
});

describe("seriesFollowIds + followsWholeSport", () => {
  it("scopes whole-sport follows by sport", () => {
    const follows = [nflWholeSeason()];
    expect(followsWholeSport(follows, "nfl")).toBe(true);
    expect(followsWholeSport(follows, "nba")).toBe(false);
    expect(followsWholeSport(follows, "wc")).toBe(false);
  });

  it("returns no series for a sport with no series follows", () => {
    expect(seriesFollowIds([nflTeam("CLE")], "nba")).toEqual([]);
  });
});

describe("buildNBAFollowCoverage collision gate", () => {
  it("does not treat an NFL team follow as NBA coverage", () => {
    const coverage = buildNBAFollowCoverage([nflTeam("LAC")]);
    // An NFL Chargers follow must NOT cover an NBA LAC (Clippers) game.
    expect(coverage.directTeamCodes.has("LAC")).toBe(false);
  });

  it("still covers a genuine NBA team follow", () => {
    const coverage = buildNBAFollowCoverage([nbaTeam("LAC")]);
    expect(coverage.directTeamCodes.has("LAC")).toBe(true);
  });
});

describe("followHidesParticipants sport gate", () => {
  it("does not let an NFL hide-spoilers follow hide an NBA game", () => {
    const follows = [nflTeam("CLE", true)];
    // NBA game with a colliding code, matcher told the game is NBA.
    expect(
      followHidesParticipants(follows, {
        teamCodes: ["CLE", "BOS"],
        sport: "nba",
      })
    ).toBe(false);
  });

  it("still hides the NFL game the follow actually covers", () => {
    const follows = [nflTeam("CLE", true)];
    expect(
      followHidesParticipants(follows, {
        teamCodes: ["CLE", "PIT"],
        sport: "nfl",
      })
    ).toBe(true);
  });

  it("keeps legacy (no-sport) behavior when sport is omitted", () => {
    // Back-compat: callers that don't pass sport match on the bare code.
    const follows = [nbaTeam("CLE", true)];
    expect(
      followHidesParticipants(follows, { teamCodes: ["CLE", "BOS"] })
    ).toBe(true);
  });
});

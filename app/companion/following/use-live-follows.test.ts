import { describe, expect, it } from "vitest";
import { toFollow } from "../state/follow-migration";
import type { Follow, ScopeKind } from "../state/types";
import { buildLiveFollowKeys, isFollowLive } from "./use-live-follows";

function follow(momentId: string, scope: ScopeKind, scopeId: string | null): Follow {
  return toFollow({
    momentId,
    scope,
    scopeId,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  });
}

const NFL = "nfl-season-2026";
const NBA = "nba-playoffs-2026";
const WC = "fifa-world-cup-2026";

function game(
  status: "live" | "upcoming" | "final",
  away: string,
  home: string,
  extra: { seriesRound?: string; gameContext?: string } = {}
) {
  return { status, away: { abbreviation: away }, home: { abbreviation: home }, ...extra };
}

const playoff = { seriesRound: "Conf Finals", gameContext: "East Finals · Game 3" };

describe("isFollowLive: NFL (persona sweep 2026-10-11)", () => {
  it("lights a team follow while its game is live", () => {
    const live = buildLiveFollowKeys({ nfl: [game("live", "PIT", "CLE")] });
    expect(isFollowLive(follow(NFL, "team", "PIT"), live)).toBe(true);
    expect(isFollowLive(follow(NFL, "team", "CLE"), live)).toBe(true);
    expect(isFollowLive(follow(NFL, "team", "GB"), live)).toBe(false);
  });

  it("lights a whole-season follow while any NFL game is live", () => {
    const live = buildLiveFollowKeys({ nfl: [game("live", "DEN", "LAC")] });
    expect(isFollowLive(follow(NFL, "all", null), live)).toBe(true);
  });

  it("does not light for upcoming or finished games", () => {
    const live = buildLiveFollowKeys({
      nfl: [game("upcoming", "PIT", "CLE"), game("final", "GB", "CHI")],
    });
    expect(isFollowLive(follow(NFL, "team", "PIT"), live)).toBe(false);
    expect(isFollowLive(follow(NFL, "team", "GB"), live)).toBe(false);
    expect(isFollowLive(follow(NFL, "all", null), live)).toBe(false);
  });

  it("keeps NFL and NBA codes apart (the Browns are not the Cavaliers)", () => {
    const nflOnly = buildLiveFollowKeys({ nfl: [game("live", "PIT", "CLE")] });
    expect(isFollowLive(follow(NBA, "team", "CLE"), nflOnly)).toBe(false);
    expect(isFollowLive(follow(NBA, "all", null), nflOnly)).toBe(false);

    const nbaOnly = buildLiveFollowKeys({
      nba: [game("live", "CLE", "NYK", playoff)],
    });
    expect(isFollowLive(follow(NFL, "team", "CLE"), nbaOnly)).toBe(false);
    expect(isFollowLive(follow(NFL, "all", null), nbaOnly)).toBe(false);
  });
});

describe("isFollowLive: NBA and Summer Soccer", () => {
  it("keeps colliding team and country codes inside their sport", () => {
    const live = buildLiveFollowKeys({ wc: [game("live", "POR", "ESP")] });
    expect(isFollowLive(follow(WC, "country", "POR"), live)).toBe(true);
    expect(isFollowLive(follow(NBA, "team", "POR"), live)).toBe(false);
    expect(isFollowLive(follow(WC, "all", null), live)).toBe(true);
  });

  it("matches a series follow on its matchup, not a team follow by that id", () => {
    const live = buildLiveFollowKeys({
      nba: [game("live", "LAL", "BOS", playoff)],
    });
    expect(isFollowLive(follow(NBA, "series", "BOS-LAL"), live)).toBe(true);
    expect(isFollowLive(follow(NBA, "team", "BOS"), live)).toBe(true);
    expect(isFollowLive(follow(NBA, "team", "BOS-LAL"), live)).toBe(false);
  });

  it("ignores NBA preseason games (an NBA Playoffs follow is not live in October)", () => {
    const live = buildLiveFollowKeys({
      nba: [game("live", "MIA", "TOR", { seriesRound: "", gameContext: "NBA Canada Games 2026" })],
    });
    expect(isFollowLive(follow(NBA, "team", "MIA"), live)).toBe(false);
    expect(isFollowLive(follow(NBA, "all", null), live)).toBe(false);
  });

  it("counts the Play-In, which has no series round", () => {
    const live = buildLiveFollowKeys({
      nba: [game("live", "MIA", "CHI", { seriesRound: "", gameContext: "East Play-In" })],
    });
    expect(isFollowLive(follow(NBA, "team", "MIA"), live)).toBe(true);
  });
});

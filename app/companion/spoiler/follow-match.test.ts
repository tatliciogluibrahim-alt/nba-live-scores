import { describe, expect, it } from "vitest";
import type { Follow, FollowKind } from "../state/types";
import { followHidesParticipants } from "./follow-match";

function follow(
  kind: FollowKind,
  id: string,
  hideSpoilers = true
): Follow {
  return {
    kind,
    id,
    hideSpoilers,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  };
}

describe("followHidesParticipants", () => {
  it("matches a hidden team follow", () => {
    expect(
      followHidesParticipants([follow("team", "NYK")], {
        teamCodes: ["BOS", "NYK"],
      })
    ).toBe(true);
  });

  it("matches a hidden country follow", () => {
    expect(
      followHidesParticipants([follow("country", "eng")], {
        countryCodes: ["ENG", "FRA"],
      })
    ).toBe(true);
  });

  it("matches only the exact matchup from a hidden series follow", () => {
    const follows = [follow("series", "NYK-BOS")];
    expect(
      followHidesParticipants(follows, { teamCodes: ["NYK", "BOS"] })
    ).toBe(true);
    expect(
      followHidesParticipants(follows, { teamCodes: ["BOS", "CLE"] })
    ).toBe(false);
  });

  it("ignores follows whose selective switch is off", () => {
    expect(
      followHidesParticipants([follow("team", "NYK", false)], {
        teamCodes: ["NYK", "BOS"],
      })
    ).toBe(false);
  });

  it("does not treat a tournament follow as selective hiding", () => {
    expect(
      followHidesParticipants(
        [follow("tournament", "nba-playoffs-2025")],
        { teamCodes: ["NYK", "BOS"] }
      )
    ).toBe(false);
  });

  it("does not hide an unrelated matchup", () => {
    expect(
      followHidesParticipants(
        [follow("team", "NYK"), follow("country", "ENG")],
        { teamCodes: ["BOS", "CLE"], countryCodes: ["FRA", "ESP"] }
      )
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { Follow } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";
import {
  buildNBAFollowCoverage,
  nbaGameMatchesFollowCoverage,
} from "./nba-follow-coverage";

function follow(kind: Follow["kind"], id: string): Follow {
  return legacyRefToFollow(kind, id, {
    alertEnabled: false,
    alertTier: "quiet",
    followedAt: 1,
  })!;
}

describe("NBA follow coverage", () => {
  it("matches both orientations of an exact followed series", () => {
    const coverage = buildNBAFollowCoverage([
      follow("series", "NYK-BOS"),
    ]);

    expect(nbaGameMatchesFollowCoverage(coverage, "NYK", "BOS")).toBe(true);
    expect(nbaGameMatchesFollowCoverage(coverage, "BOS", "NYK")).toBe(true);
  });

  it("does not promote one series participant into a direct team follow", () => {
    const coverage = buildNBAFollowCoverage([
      follow("series", "NYK-BOS"),
    ]);

    expect(nbaGameMatchesFollowCoverage(coverage, "BOS", "CLE")).toBe(false);
    expect(nbaGameMatchesFollowCoverage(coverage, "NYK", "MIA")).toBe(false);
  });

  it("keeps direct team follows eligible against any opponent", () => {
    const coverage = buildNBAFollowCoverage([follow("team", "BOS")]);

    expect(nbaGameMatchesFollowCoverage(coverage, "BOS", "CLE")).toBe(true);
  });
});

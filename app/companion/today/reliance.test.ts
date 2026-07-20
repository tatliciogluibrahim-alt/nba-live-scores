import { describe, it, expect } from "vitest";
import { buildTodayPayload, type WCGameLite } from "./today-data";
import type { Follow } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";

function follow(over: Partial<Follow> = {}): Follow {
  const { kind = "country", id = "FRA", ...rest } = over;
  return {
    ...legacyRefToFollow(kind, id, {
      alertEnabled: true,
      alertTier: "companion",
      followedAt: 0,
    })!,
    ...rest,
  };
}

function wcFinal(over: Partial<WCGameLite> = {}): WCGameLite {
  return {
    id: "w1",
    date: new Date().toISOString(),
    status: "final",
    statusText: "FT",
    stage: "Final",
    group: "",
    home: { name: "Spain", abbreviation: "ESP", score: 1 },
    away: { name: "France", abbreviation: "FRA", score: 2 },
    broadcasts: [],
    watchLabel: "",
    ...over,
  };
}

const base = { nba: [], nbaRecent: [], pinned: [] };

describe("reliancePrompt (the alert truth loop)", () => {
  it("surfaces a recent followed final the user had alerts on, as a direct follow", () => {
    const now = new Date();
    const p = buildTodayPayload({
      ...base,
      wc: [wcFinal({ date: new Date(now.getTime() - 3_600_000).toISOString() })],
      follows: [follow({ alertTier: "companion" })],
      now,
    }).reliancePrompt;
    expect(p).not.toBeNull();
    expect(p?.sport).toBe("wc");
    expect(p?.tier).toBe("companion");
    expect(p?.followKind).toBe("direct");
    expect(p?.gameId).toBe("w1");
  });

  it("is null when the followed match had no alerts enabled", () => {
    const p = buildTodayPayload({
      ...base,
      wc: [wcFinal()],
      follows: [follow({ alertEnabled: false })],
      now: new Date(),
    }).reliancePrompt;
    expect(p).toBeNull();
  });

  it("is null when the match is older than 24h", () => {
    const now = new Date();
    const p = buildTodayPayload({
      ...base,
      wc: [wcFinal({ date: new Date(now.getTime() - 48 * 3_600_000).toISOString() })],
      follows: [follow()],
      now,
    }).reliancePrompt;
    expect(p).toBeNull();
  });

  it("prefers a direct follow over a broad tournament follow", () => {
    const p = buildTodayPayload({
      ...base,
      wc: [wcFinal()],
      follows: [
        legacyRefToFollow("tournament", "fifa-world-cup-2026", {
          alertEnabled: true,
          alertTier: "quiet",
          followedAt: 0,
        })!,
        follow({ alertTier: "all" }),
      ],
      now: new Date(),
    }).reliancePrompt;
    expect(p?.followKind).toBe("direct");
    expect(p?.tier).toBe("all");
  });
});

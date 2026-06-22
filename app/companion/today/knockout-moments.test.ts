import { describe, it, expect } from "vitest";
import { buildKnockoutMoments } from "./today-data";
import type { Follow } from "../state/types";

// Minimal WCGameLite-ish fixture (only the fields buildKnockoutMoments reads).
function wc(over: Record<string, unknown> = {}) {
  return {
    id: "g1",
    date: "2026-06-28T17:00Z",
    status: "final",
    statusText: "FT",
    stage: "Round of 32",
    group: "",
    home: { abbreviation: "POR", name: "Portugal", score: 1 },
    away: { abbreviation: "USA", name: "United States", score: 2 },
    broadcasts: [],
    watchLabel: "",
    ...over,
  } as Parameters<typeof buildKnockoutMoments>[0][number];
}

const follow = (kind: Follow["kind"], id: string): Follow => ({
  kind,
  id,
  alertEnabled: false,
  alertTier: "companion",
  followedAt: 1,
});

describe("buildKnockoutMoments", () => {
  it("returns nothing when the user follows no countries", () => {
    expect(buildKnockoutMoments([wc()], [follow("tournament", "fifa-world-cup-2026")])).toEqual([]);
  });

  it("builds an 'advanced' moment for a followed country that won", () => {
    const [m] = buildKnockoutMoments([wc()], [follow("country", "USA")]);
    expect(m.outcome).toBe("advanced");
    expect(m.countryCode).toBe("USA");
    expect(m.stageLabel).toBe("Round of 32");
    expect(m.nextStage).toBe("Round of 16");
    expect(m.isChampion).toBe(false);
    expect(m.id).toBe("ko:g1:USA");
    expect(m.href).toBe("/country/USA");
  });

  it("builds an 'eliminated' moment for a followed country that lost", () => {
    const [m] = buildKnockoutMoments([wc()], [follow("country", "POR")]);
    expect(m.outcome).toBe("eliminated");
    expect(m.nextStage).toBe(""); // no next stage when out
  });

  it("marks Final winners as champions", () => {
    const [m] = buildKnockoutMoments(
      [wc({ id: "fin", stage: "Final" })],
      [follow("country", "USA")]
    );
    expect(m.isChampion).toBe(true);
    expect(m.nextStage).toBe("Champions");
  });

  it("ignores group-stage finals and live knockout matches", () => {
    expect(buildKnockoutMoments([wc({ stage: "Group D" })], [follow("country", "USA")])).toEqual([]);
    expect(buildKnockoutMoments([wc({ status: "live" })], [follow("country", "USA")])).toEqual([]);
  });

  it("keeps only the most recent decided knockout match per country", () => {
    const r32 = wc({ id: "r32", stage: "Round of 32", date: "2026-06-28T17:00Z" });
    const r16 = wc({
      id: "r16",
      stage: "Round of 16",
      date: "2026-07-04T17:00Z",
      home: { abbreviation: "BRA", name: "Brazil", score: 0 },
      away: { abbreviation: "USA", name: "United States", score: 1 },
    });
    const items = buildKnockoutMoments([r32, r16], [follow("country", "USA")]);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("ko:r16:USA"); // the later round wins
    expect(items[0].nextStage).toBe("Quarterfinals");
  });
});

import { describe, it, expect } from "vitest";
import { latestScorer, parseMinute, type ScorerEvent } from "./wc-scorer";

const goal = (
  minute: string | null,
  playerName: string | undefined,
  type: ScorerEvent["type"] = "goal"
): ScorerEvent => ({ minute, type, playerName });

describe("parseMinute", () => {
  it("parses the prime, plain digits, and stoppage time", () => {
    expect(parseMinute("9'")).toBe(9);
    expect(parseMinute("75'")).toBe(75);
    expect(parseMinute("45+2")).toBe(47);
    expect(parseMinute("90'+2'")).toBe(92);
  });
  it("returns null for non-minute clocks", () => {
    expect(parseMinute(null)).toBe(null);
    expect(parseMinute(undefined)).toBe(null);
    expect(parseMinute("HT")).toBe(null);
    expect(parseMinute("")).toBe(null);
  });
});

describe("latestScorer", () => {
  it("picks the highest-minute goal numerically, NOT by string compare", () => {
    // The regression: "9'" >= "75'" is TRUE as a string compare, which used
    // to name the 9th-minute scorer as the latest. 75 > 9 numerically.
    expect(latestScorer([goal("9'", "Alvarez"), goal("75'", "Martinez")])).toBe(
      "Martinez"
    );
    expect(latestScorer([goal("45'", "Kane"), goal("8'", "Saka")])).toBe("Kane");
    // Stoppage-time goal beats a 90' goal.
    expect(latestScorer([goal("90'", "A"), goal("90'+3'", "B")])).toBe("B");
  });

  it("tags own goals (OG) and still respects the latest minute", () => {
    expect(latestScorer([goal("30'", "A"), goal("80'", "B", "own_goal")])).toBe(
      "B (OG)"
    );
  });

  it("returns null when no named goal exists", () => {
    expect(latestScorer([])).toBe(null);
    expect(latestScorer(undefined)).toBe(null);
    expect(latestScorer([goal("10'", undefined)])).toBe(null);
    expect(latestScorer([{ minute: "20'", type: "yellow_card", playerName: "C" }])).toBe(
      null
    );
  });
});

import { describe, it, expect } from "vitest";
import { computeLiveActivityProgress } from "./live-activity-progress";

// The lock-screen rail's parser: 9 consumers, and its NFL branch first runs
// in production on opening night. Table-locked here so a status-format
// change from ESPN degrades to a 0 (empty rail) loudly in tests, not
// silently on lock screens.

describe("computeLiveActivityProgress — nfl (15-min quarters)", () => {
  const cases: [string, number][] = [
    ["Q1 15:00", 0],
    ["Q1 7:30", 0.125],
    ["Q2 15:00", 0.25],
    ["Halftime", 0.5],
    ["Q3 15:00", 0.5],
    ["Q4 15:00", 0.75],
    ["Q4 0:00", 1],
    ["OT", 1],
    ["Final", 1],
  ];
  for (const [line, want] of cases) {
    it(`"${line}" → ${want}`, () => {
      expect(computeLiveActivityProgress("nfl", line)).toBeCloseTo(want, 3);
    });
  }
  it("status overrides: final → 1, upcoming → 0", () => {
    expect(computeLiveActivityProgress("nfl", "Q2 8:00", "final")).toBe(1);
    expect(computeLiveActivityProgress("nfl", "", "upcoming")).toBe(0);
  });
  it("unparseable stays calm at 0", () => {
    expect(computeLiveActivityProgress("nfl", "Delayed")).toBe(0);
  });
});

describe("computeLiveActivityProgress — nba (12-min quarters)", () => {
  it("Q3 · 6:00 → halfway through Q3", () => {
    expect(computeLiveActivityProgress("nba", "Q3 · 6:00")).toBeCloseTo(0.625, 3);
  });
  it("End Q1 → quarter boundary", () => {
    expect(computeLiveActivityProgress("nba", "End Q1")).toBeCloseTo(0.25, 3);
  });
});

describe("computeLiveActivityProgress — wc (minute / 90)", () => {
  const cases: [string, number][] = [
    ["45'", 0.5],
    ["HT", 0.5],
    ["90+3'", 1],
    ["FT", 1],
  ];
  for (const [line, want] of cases) {
    it(`"${line}" → ${want}`, () => {
      expect(computeLiveActivityProgress("wc", line)).toBeCloseTo(want, 3);
    });
  }
});

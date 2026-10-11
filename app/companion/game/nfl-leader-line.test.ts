import { describe, it, expect } from "vitest";
import { formatLeaderLine } from "./nfl-leader-line";

// ESPN's leader lines are box-score agate: CAR, REC, TD and INT stay the
// same for one or many ("1 REC", "7 CAR", "2 TD"). Only yards take a plural,
// and ESPN prints "1 YDS" (persona sweep 2026-10-11: "1 CAR, 1 YDS").

describe("formatLeaderLine", () => {
  it("one yard is YD", () => {
    expect(formatLeaderLine("1 CAR, 1 YDS")).toBe("1 CAR, 1 YD");
    expect(formatLeaderLine("1/1, 1 YDS")).toBe("1/1, 1 YD");
    expect(formatLeaderLine("1 REC, 1 YDS, 1 TD")).toBe("1 REC, 1 YD, 1 TD");
  });

  it("minus one yard is YD too", () => {
    expect(formatLeaderLine("2 CAR, -1 YDS")).toBe("2 CAR, -1 YD");
  });

  it("everything else is ESPN's line, untouched (real Week 5 lines)", () => {
    for (const line of [
      "15/18, 193 YDS, 2 TD",
      "7 CAR, 30 YDS, 1 TD",
      "1 REC, 23 YDS",
      "9/15, 68 YDS, 1 INT",
      "3 CAR, 0 YDS",
      "2 CAR, 11 YDS",
      "1 CAR, 21 YDS",
    ]) {
      expect(formatLeaderLine(line)).toBe(line);
    }
  });
});

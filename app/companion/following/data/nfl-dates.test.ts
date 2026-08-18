import { describe, it, expect } from "vitest";
import {
  nextNFLWeek,
  nflPagerLabel,
  nflSeasonBounds,
  nflWeekHeader,
  nflWeekLabel,
} from "./nfl-dates";

describe("NFL week naming", () => {
  it("never reads a preseason week as a season week", () => {
    expect(nflWeekLabel(1, 2)).toBe("Preseason · Wk 2");
    expect(nflPagerLabel(1, 2)).toBe("Preseason · Wk 2");
  });
  it("carries the denominator only in the regular season pager", () => {
    expect(nflWeekLabel(2, 5)).toBe("Week 5");
    expect(nflPagerLabel(2, 5)).toBe("Week 5 of 18");
    expect(nflWeekHeader(2, 5)).toBe("Week 5");
  });
  it("names postseason rounds instead of numbering them", () => {
    expect(nflWeekLabel(3, 1)).toBe("Wild Card");
    expect(nflWeekLabel(3, 5)).toBe("Super Bowl");
    expect(nflWeekLabel(3, 4)).toBe("Playoffs · Wk 4"); // old Pro Bowl slot
  });
  it("bounds each season type", () => {
    expect(nflSeasonBounds(1).max).toBe(4);
    expect(nflSeasonBounds(2).max).toBe(18);
    expect(nflSeasonBounds(3).max).toBe(5);
  });
});

describe("nextNFLWeek", () => {
  it("steps within a season type", () => {
    expect(nextNFLWeek(1, 2)).toEqual({ seasonType: 1, week: 3 });
    expect(nextNFLWeek(2, 17)).toEqual({ seasonType: 2, week: 18 });
  });
  it("rolls preseason into week 1 of the regular season", () => {
    expect(nextNFLWeek(1, 4)).toEqual({ seasonType: 2, week: 1 });
  });
  it("rolls the regular season into the playoffs", () => {
    expect(nextNFLWeek(2, 18)).toEqual({ seasonType: 3, week: 1 });
  });
  it("stops after the Super Bowl", () => {
    expect(nextNFLWeek(3, 5)).toBeNull();
  });
});

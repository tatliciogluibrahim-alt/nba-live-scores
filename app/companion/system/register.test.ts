import { describe, it, expect } from "vitest";
import { peakEligible, rungFor } from "./register";

describe("peakEligible (the elimination law, spec §1)", () => {
  it("NBA Game 7 qualifies", () => {
    expect(peakEligible({ sport: "nba", isGame7: true })).toBe(true);
  });
  it("NBA non-Game-7 does not qualify, even a Finals game 2", () => {
    expect(peakEligible({ sport: "nba", isGame7: false, isFinals: true, isClinchGame: false })).toBe(false);
  });
  it("NBA clinch-capable Finals game qualifies", () => {
    expect(peakEligible({ sport: "nba", isFinals: true, isClinchGame: true })).toBe(true);
  });
  it("WC quarterfinal onward qualifies only when followed", () => {
    expect(peakEligible({ sport: "wc", stage: "Quarterfinal", followed: true })).toBe(true);
    expect(peakEligible({ sport: "wc", stage: "Quarterfinal", followed: false })).toBe(false);
  });
  it("WC Final qualifies for everyone", () => {
    expect(peakEligible({ sport: "wc", stage: "Final", followed: false })).toBe(true);
  });
  it("WC Round of 32 / Round of 16 / group stage do not qualify", () => {
    expect(peakEligible({ sport: "wc", stage: "Round of 32", followed: true })).toBe(false);
    expect(peakEligible({ sport: "wc", stage: "Round of 16", followed: true })).toBe(false);
    expect(peakEligible({ sport: "wc", stage: "Group Stage", followed: true })).toBe(false);
  });
});

describe("rungFor", () => {
  it("live + peak-eligible = peak", () => {
    expect(rungFor({ status: "live", peak: true })).toBe("peak");
  });
  it("peak-eligible but not live = rest (rung 3 is live-only)", () => {
    expect(rungFor({ status: "upcoming", peak: true })).toBe("rest");
  });
  it("live without peak = live", () => {
    expect(rungFor({ status: "live", peak: false })).toBe("live");
  });
  it("final/upcoming = rest", () => {
    expect(rungFor({ status: "final", peak: false })).toBe("rest");
    expect(rungFor({ status: "upcoming", peak: false })).toBe("rest");
  });
});

import { describe, it, expect } from "vitest";
import { tournamentPhase } from "./tournament-phase";

const WC = "fifa-world-cup-2026";

describe("tournamentPhase — Summer Soccer (from the real fixture schedule)", () => {
  it("is 'pre' before the first group kickoff", () => {
    expect(tournamentPhase(WC, new Date("2026-06-01T00:00:00Z"))).toBe("pre");
  });

  it("is 'group' during the group stage", () => {
    expect(tournamentPhase(WC, new Date("2026-06-20T18:00:00Z"))).toBe("group");
  });

  it("is 'knockout' once the group stage is done (R32 window)", () => {
    // Group stage wraps ~Jun 27; Round of 32 is Jun 28.
    expect(tournamentPhase(WC, new Date("2026-06-28T18:00:00Z"))).toBe(
      "knockout"
    );
    expect(tournamentPhase(WC, new Date("2026-07-10T18:00:00Z"))).toBe(
      "knockout"
    );
  });

  it("is 'concluded' after the final", () => {
    // Final is 2026-07-19.
    expect(tournamentPhase(WC, new Date("2026-07-25T00:00:00Z"))).toBe(
      "concluded"
    );
  });
});

describe("tournamentPhase — other tournaments", () => {
  it("defaults to 'group' (active) until per-sport derivation lands", () => {
    expect(tournamentPhase("nba-playoffs-2025")).toBe("group");
  });
});

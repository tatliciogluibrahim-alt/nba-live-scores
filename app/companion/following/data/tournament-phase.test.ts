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

describe("tournamentPhase — NBA playoffs (active vs concluded by season year)", () => {
  it("is active ('group') during the playoff window", () => {
    expect(tournamentPhase("nba-playoffs-2026", new Date("2026-05-15T00:00:00Z"))).toBe(
      "group"
    );
  });

  it("is 'concluded' from July 1 of the season year onward", () => {
    expect(tournamentPhase("nba-playoffs-2025", new Date("2025-07-01T00:00:00Z"))).toBe(
      "concluded"
    );
    // A prior season is concluded forever after.
    expect(tournamentPhase("nba-playoffs-2025", new Date("2026-06-26T00:00:00Z"))).toBe(
      "concluded"
    );
  });

  it("defaults to 'group' for an unknown tournament", () => {
    expect(tournamentPhase("nfl-season-2026", new Date("2026-06-26T00:00:00Z"))).toBe(
      "group"
    );
  });
});

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

  it("NFL: pre before the opener, active in-season, concluded after the Super Bowl", () => {
    // Before the Sept 9 2026 opener.
    expect(tournamentPhase("nfl-season-2026", new Date("2026-08-01T00:00:00Z"))).toBe(
      "pre"
    );
    // Mid-season (Week 1 window through January).
    expect(tournamentPhase("nfl-season-2026", new Date("2026-11-15T00:00:00Z"))).toBe(
      "group"
    );
    // The day of the Super Bowl (Feb 14 2027) is still active.
    expect(tournamentPhase("nfl-season-2026", new Date("2027-02-14T12:00:00Z"))).toBe(
      "group"
    );
    // Well after it → concluded.
    expect(tournamentPhase("nfl-season-2026", new Date("2027-03-01T00:00:00Z"))).toBe(
      "concluded"
    );
  });

  it("defaults to 'group' for a genuinely unknown tournament", () => {
    expect(tournamentPhase("ncaa-madness-2027", new Date("2027-03-20T00:00:00Z"))).toBe(
      "group"
    );
  });
});

import { describe, it, expect } from "vitest";
import { buildAllGroupsDetailed, buildCountryPayload } from "./country-data";
import type { WCGameLite } from "../today/today-data";

// Group A is MEX · CZE · KOR · RSA (directory order). The curated static
// schedule (wc-fixtures.ts) puts MD1 on Jun 11, MD2 on Jun 16, MD3 on
// Jun 20. These tests pin the honesty gate and the "awaiting result"
// handling that the live preview's simulated dates can't exercise.

function wcGame(
  group: string,
  away: string,
  home: string,
  awayScore: number,
  homeScore: number,
  date: string
): WCGameLite {
  return {
    id: `${away}-${home}-${date}`,
    date,
    status: "final",
    statusText: "FT",
    stage: `Group ${group}`,
    group,
    home: { name: home, abbreviation: home, score: homeScore },
    away: { name: away, abbreviation: away, score: awayScore },
    broadcasts: [],
    watchLabel: "",
  };
}

function groupA(games: WCGameLite[], now: number) {
  const block = buildAllGroupsDetailed(games, now).find((g) => g.letter === "A");
  if (!block) throw new Error("Group A missing");
  return block;
}

describe("buildAllGroupsDetailed", () => {
  it("returns all 12 groups, each with a complete six-match schedule", () => {
    const groups = buildAllGroupsDetailed([], Date.parse("2026-06-10T00:00:00Z"));
    expect(groups.map((g) => g.letter)).toEqual([
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
    ]);
    for (const g of groups) {
      expect(g.schedule).toHaveLength(6);
    }
  });

  it("shows standings only once in-window finals cover everything due by now", () => {
    // now = just after MD1 (Jun 11), before MD2. Both MD1 games are final
    // and present → dueByNow (2) is fully covered → standings trusted.
    const now = Date.parse("2026-06-12T00:00:00Z");
    const block = groupA(
      [
        wcGame("A", "MEX", "CZE", 2, 0, "2026-06-11T19:00:00Z"),
        wcGame("A", "KOR", "RSA", 1, 1, "2026-06-11T22:00:00Z"),
      ],
      now
    );
    expect(block.standingsTrustworthy).toBe(true);
    const mex = block.rows.find((r) => r.code === "MEX");
    expect(mex?.standing?.played).toBe(1);
    expect(mex?.standing?.points).toBe(3);
    // Winner sorts to the top once standings are trusted.
    expect(block.rows[0].code).toBe("MEX");
  });

  it("suppresses standings when an early matchday has rolled off the window", () => {
    // now = Jun 18: MD1 + MD2 are due, but the feed is empty (rolled off).
    // Showing 0-point standings would be a lie → gate them off.
    const now = Date.parse("2026-06-18T12:00:00Z");
    const block = groupA([], now);
    expect(block.standingsTrustworthy).toBe(false);
    expect(block.rows.every((r) => r.standing === undefined)).toBe(true);
  });

  it("marks rolled-off past fixtures as awaiting result, not upcoming", () => {
    const now = Date.parse("2026-06-18T12:00:00Z");
    const block = groupA([], now);
    const past = block.schedule.filter((m) => m.awaitingResult);
    const future = block.schedule.filter((m) => !m.awaitingResult);
    // MD1 (Jun 11) + MD2 (Jun 16) have passed; MD3 (Jun 20) is still ahead.
    expect(past).toHaveLength(4);
    expect(future).toHaveLength(2);
    // "Next" never points at a past fixture.
    expect(block.next).not.toBeNull();
    expect(block.next?.awaitingResult).toBe(false);
  });

  it("labels matchdays by chronological order, not the pairing guess", () => {
    const now = Date.parse("2026-06-25T00:00:00Z");
    const games = [
      wcGame("A", "KOR", "MEX", 1, 0, "2026-06-11T19:00:00Z"),
      wcGame("A", "CZE", "RSA", 2, 2, "2026-06-11T22:00:00Z"),
      wcGame("A", "MEX", "CZE", 0, 0, "2026-06-16T16:00:00Z"),
      wcGame("A", "KOR", "RSA", 1, 1, "2026-06-16T19:00:00Z"),
      wcGame("A", "MEX", "RSA", 3, 1, "2026-06-20T19:00:00Z"),
      wcGame("A", "CZE", "KOR", 2, 1, "2026-06-20T19:00:00Z"),
    ];
    const block = groupA(games, now);
    // Matchday must never decrease as kickoff increases — so the sections
    // always read MD1 -> MD2 -> MD3 top to bottom, matching the dates.
    for (let i = 1; i < block.schedule.length; i++) {
      expect(block.schedule[i].matchday).toBeGreaterThanOrEqual(
        block.schedule[i - 1].matchday
      );
    }
    expect(block.schedule[0].matchday).toBe(1);
    expect(block.schedule[5].matchday).toBe(3);
  });

  it("country payload shares the same standings honesty gate", () => {
    // Trustworthy: now just after MD1, both MD1 finals present.
    const trusted = buildCountryPayload(
      "MEX",
      [
        wcGame("A", "MEX", "CZE", 2, 0, "2026-06-11T19:00:00Z"),
        wcGame("A", "KOR", "RSA", 1, 1, "2026-06-11T22:00:00Z"),
      ],
      Date.parse("2026-06-12T00:00:00Z")
    );
    expect(trusted?.groupRows.some((r) => r.standing !== undefined)).toBe(true);
    expect(trusted?.groupStake).not.toBeNull();

    // Untrustworthy: Jun 18 with an empty feed (MD1 rolled off). No
    // standings, no live stake — the view falls back to the structural one.
    const untrusted = buildCountryPayload(
      "MEX",
      [],
      Date.parse("2026-06-18T12:00:00Z")
    );
    expect(untrusted?.groupRows.every((r) => r.standing === undefined)).toBe(
      true
    );
    expect(untrusted?.groupStake).toBeNull();
  });

  it("reports a complete group once all six are final", () => {
    const now = Date.parse("2026-06-21T00:00:00Z");
    const games = [
      wcGame("A", "MEX", "CZE", 2, 0, "2026-06-11T19:00:00Z"),
      wcGame("A", "KOR", "RSA", 1, 1, "2026-06-11T22:00:00Z"),
      wcGame("A", "MEX", "KOR", 1, 0, "2026-06-16T16:00:00Z"),
      wcGame("A", "CZE", "RSA", 0, 0, "2026-06-16T19:00:00Z"),
      wcGame("A", "MEX", "RSA", 3, 1, "2026-06-20T19:00:00Z"),
      wcGame("A", "CZE", "KOR", 2, 2, "2026-06-20T19:00:00Z"),
    ];
    const block = groupA(games, now);
    expect(block.phase).toBe("complete");
    expect(block.standingsTrustworthy).toBe(true);
    expect(block.next).toBeNull();

    // Scores must survive the group-card transform (the root-cause bug:
    // they were available in the feed but dropped). Canonical away/home.
    const mexCze = block.schedule.find(
      (m) => m.awayCode === "MEX" && m.homeCode === "CZE"
    );
    expect(mexCze?.awayScore).toBe(2);
    expect(mexCze?.homeScore).toBe(0);
    expect(mexCze?.statusText).toBe("FT");
  });
});

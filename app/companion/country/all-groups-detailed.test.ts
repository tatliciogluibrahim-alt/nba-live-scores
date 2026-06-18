import { describe, it, expect } from "vitest";
import {
  buildAllGroupsFromSchedule,
  buildCountryPayload,
  type WCScheduleFixtureLite,
  type WCScheduleStandingLite,
} from "./country-data";

// The groups + country pages read the real ESPN schedule + official
// standings (/api/world-cup/schedule). These lock the pure transforms:
// real scores survive, matchdays follow the dates, foreign games are
// rejected, and the two surfaces share the same standings.

function fx(
  group: string,
  away: string,
  home: string,
  awayScore: number,
  homeScore: number,
  status: WCScheduleFixtureLite["status"],
  date: string,
  statusText = status === "final" ? "FT" : status === "live" ? "55'" : "Upcoming"
): WCScheduleFixtureLite {
  return {
    id: `${away}-${home}-${date}`,
    date,
    status,
    statusText,
    stage: `Group ${group}`,
    group,
    home: { name: home, abbreviation: home, score: homeScore },
    away: { name: away, abbreviation: away, score: awayScore },
    broadcasts: ["FOX"],
  };
}

function st(
  code: string,
  played: number,
  points: number,
  gf: number,
  ga: number,
  position: number
): WCScheduleStandingLite {
  return { code, played, points, gf, ga, gd: gf - ga, position };
}

// Group A is MEX / CZE / KOR / RSA.
const GROUP_A_FIXTURES: WCScheduleFixtureLite[] = [
  fx("A", "RSA", "MEX", 0, 2, "final", "2026-06-11T19:00Z"),
  fx("A", "CZE", "KOR", 1, 2, "final", "2026-06-12T02:00Z"),
  fx("A", "RSA", "CZE", 1, 1, "final", "2026-06-16T16:00Z"),
  fx("A", "KOR", "MEX", 0, 0, "upcoming", "2026-06-18T01:00Z"),
  fx("A", "MEX", "CZE", 0, 0, "upcoming", "2026-06-24T19:00Z"),
  fx("A", "KOR", "RSA", 0, 0, "upcoming", "2026-06-24T19:00Z"),
];
const GROUP_A_STANDINGS: Record<string, WCScheduleStandingLite[]> = {
  A: [st("MEX", 1, 3, 2, 0, 1), st("KOR", 1, 3, 2, 1, 2), st("CZE", 2, 1, 2, 3, 3), st("RSA", 2, 1, 1, 3, 4)],
};

describe("buildAllGroupsFromSchedule", () => {
  it("returns all 12 groups", () => {
    const groups = buildAllGroupsFromSchedule([], {});
    expect(groups.map((g) => g.letter)).toEqual([
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
    ]);
  });

  it("threads real scores and official standings through", () => {
    const block = buildAllGroupsFromSchedule(
      GROUP_A_FIXTURES,
      GROUP_A_STANDINGS
    ).find((g) => g.letter === "A")!;
    // Standings come straight from the official table (CZE played 2, not 1).
    expect(block.rows[0].code).toBe("MEX");
    expect(block.rows.find((r) => r.code === "CZE")?.standing?.played).toBe(2);
    expect(block.rows.find((r) => r.code === "CZE")?.standing?.points).toBe(1);
    // A final fixture carries its real score.
    const opener = block.schedule.find(
      (m) => m.awayCode === "RSA" && m.homeCode === "MEX"
    );
    expect(opener?.awayScore).toBe(0);
    expect(opener?.homeScore).toBe(2);
  });

  it("labels matchdays by chronological order", () => {
    const block = buildAllGroupsFromSchedule(
      GROUP_A_FIXTURES,
      GROUP_A_STANDINGS
    ).find((g) => g.letter === "A")!;
    for (let i = 1; i < block.schedule.length; i++) {
      expect(block.schedule[i].matchday).toBeGreaterThanOrEqual(
        block.schedule[i - 1].matchday
      );
    }
    expect(block.schedule[0].matchday).toBe(1);
    expect(block.schedule[5].matchday).toBe(3);
  });

  it("rejects a feed game whose teams aren't both in the group", () => {
    // ENG is in Group L, not B — must not pollute Group B or add a 7th match.
    const block = buildAllGroupsFromSchedule(
      [
        ...["CAN", "BIH", "SUI", "QAT"].flatMap(() => []),
        fx("B", "ENG", "SUI", 1, 0, "live", "2026-06-18T19:00Z"),
        fx("B", "CAN", "BIH", 1, 1, "final", "2026-06-12T19:00Z"),
      ],
      {}
    ).find((g) => g.letter === "B")!;
    const codes = block.schedule.flatMap((m) => [m.awayCode, m.homeCode]);
    expect(codes).not.toContain("ENG");
  });
});

describe("buildCountryPayload (schedule-based)", () => {
  it("builds a country's real fixtures + standing", () => {
    const payload = buildCountryPayload("MEX", GROUP_A_FIXTURES, GROUP_A_STANDINGS);
    expect(payload).not.toBeNull();
    // Three group fixtures involve Mexico.
    expect(payload!.fixtures.length).toBe(3);
    // Standing is the official one (Mexico 1st).
    expect(payload!.groupRows[0].code).toBe("MEX");
    expect(payload!.groupRows[0].standing?.position).toBe(1);
    // Next match is the soonest upcoming (KOR vs MEX).
    expect(payload!.nextMatch?.status).toBe("upcoming");
  });

  it("returns null for an unknown country code", () => {
    expect(buildCountryPayload("ZZZ", [], {})).toBeNull();
  });
});

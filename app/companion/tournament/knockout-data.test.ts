import { describe, it, expect } from "vitest";
import {
  buildKnockoutRounds,
  buildKnockoutPreview,
  KNOCKOUT_STATIC_DATES,
  roundKeyFromStage,
  knockoutResult,
  countryKnockoutOutcome,
  nextStageLabel,
  type KnockoutGameLike,
  type KnockoutRoundKey,
} from "./knockout-data";
import type { WCScheduleFixtureLite } from "../country/country-data";

function fx(over: Partial<WCScheduleFixtureLite> & { id: string; stage: string }): WCScheduleFixtureLite {
  return {
    date: "2026-06-28T17:00Z",
    status: "upcoming",
    statusText: "Upcoming",
    group: "",
    home: { name: "Home", abbreviation: "TBD", score: 0 },
    away: { name: "Away", abbreviation: "TBD", score: 0 },
    broadcasts: [],
    ...over,
  };
}

const STATIC = {
  r32: "2026-06-28T00:00:00Z",
  r16: "2026-07-03T00:00:00Z",
  qf: "2026-07-09T00:00:00Z",
  sf: "2026-07-14T00:00:00Z",
  final: "2026-07-19T00:00:00Z",
} satisfies Record<KnockoutRoundKey, string>;

describe("roundKeyFromStage", () => {
  it("maps headline and slug forms", () => {
    expect(roundKeyFromStage("Round of 32")).toBe("r32");
    expect(roundKeyFromStage("round-of-32")).toBe("r32");
    expect(roundKeyFromStage("Round of 16")).toBe("r16");
    expect(roundKeyFromStage("Quarterfinals")).toBe("qf");
    expect(roundKeyFromStage("Semifinal")).toBe("sf");
    expect(roundKeyFromStage("Final")).toBe("final");
  });

  it("does not mistake quarterfinal/semifinal for the Final", () => {
    expect(roundKeyFromStage("quarterfinal")).toBe("qf");
    expect(roundKeyFromStage("semifinal")).toBe("sf");
  });

  it("returns null for group-stage / unknown stages", () => {
    expect(roundKeyFromStage("Group A")).toBeNull();
    expect(roundKeyFromStage("")).toBeNull();
  });
});

describe("buildKnockoutRounds", () => {
  it("returns all five rounds in order, all unresolved with no fixtures", () => {
    const rounds = buildKnockoutRounds([], STATIC);
    expect(rounds.map((r) => r.key)).toEqual(["r32", "r16", "qf", "sf", "final"]);
    expect(rounds.every((r) => !r.resolved && r.matches.length === 0)).toBe(true);
    // Dates come from the static fallback.
    expect(rounds[0].dateLabel).toBeTruthy();
  });

  it("keeps a round unresolved when ESPN only has placeholder slots", () => {
    const rounds = buildKnockoutRounds(
      [
        fx({
          id: "k1",
          stage: "Round of 32",
          home: { name: "Group A 2nd Place", abbreviation: "2A", score: 0 },
          away: { name: "Group B 1st Place", abbreviation: "1B", score: 0 },
        }),
      ],
      STATIC
    );
    const r32 = rounds.find((r) => r.key === "r32")!;
    expect(r32.resolved).toBe(false);
    expect(r32.matches).toHaveLength(0);
    expect(r32.dateLabel).toBeTruthy(); // still shows the round date
  });

  it("resolves a matchup once both sides are real country codes", () => {
    const rounds = buildKnockoutRounds(
      [
        fx({
          id: "k2",
          stage: "Round of 32",
          status: "upcoming",
          home: { name: "Portugal", abbreviation: "POR", score: 0 },
          away: { name: "United States", abbreviation: "USA", score: 0 },
        }),
      ],
      STATIC
    );
    const r32 = rounds.find((r) => r.key === "r32")!;
    expect(r32.resolved).toBe(true);
    expect(r32.matches).toHaveLength(1);
    expect(r32.matches[0].awayCode).toBe("USA");
    expect(r32.matches[0].homeCode).toBe("POR");
    expect(r32.matches[0].scoreLine).toBeNull(); // upcoming
    expect(r32.matches[0].href).toBe("/game/k2");
  });

  it("shows a score line for a played knockout match", () => {
    const rounds = buildKnockoutRounds(
      [
        fx({
          id: "k3",
          stage: "round-of-16",
          status: "final",
          away: { name: "Brazil", abbreviation: "BRA", score: 2 },
          home: { name: "South Korea", abbreviation: "KOR", score: 1 },
        }),
      ],
      STATIC
    );
    const r16 = rounds.find((r) => r.key === "r16")!;
    expect(r16.matches[0].scoreLine).toBe("2 – 1");
  });

  it("sorts matches within a round chronologically", () => {
    const rounds = buildKnockoutRounds(
      [
        fx({ id: "late", stage: "Round of 32", date: "2026-06-28T22:00Z",
          home: { name: "Spain", abbreviation: "ESP", score: 0 },
          away: { name: "Uruguay", abbreviation: "URU", score: 0 } }),
        fx({ id: "early", stage: "Round of 32", date: "2026-06-28T13:00Z",
          home: { name: "France", abbreviation: "FRA", score: 0 },
          away: { name: "Senegal", abbreviation: "SEN", score: 0 } }),
      ],
      STATIC
    );
    const r32 = rounds.find((r) => r.key === "r32")!;
    expect(r32.matches.map((m) => m.id)).toEqual(["early", "late"]);
  });
});

function ko(over: Partial<KnockoutGameLike> = {}): KnockoutGameLike {
  return {
    stage: "Round of 32",
    status: "final",
    home: { abbreviation: "POR", score: 1 },
    away: { abbreviation: "USA", score: 0 },
    ...over,
  };
}

describe("knockoutResult / countryKnockoutOutcome", () => {
  it("resolves a regulation winner", () => {
    const r = knockoutResult(ko({ home: { abbreviation: "POR", score: 2 }, away: { abbreviation: "USA", score: 1 } }));
    expect(r).toEqual({ winnerCode: "POR", loserCode: "USA", stageKey: "r32" });
  });

  it("resolves a penalty winner when level after the match", () => {
    const r = knockoutResult(
      ko({
        home: { abbreviation: "POR", score: 1 },
        away: { abbreviation: "USA", score: 1 },
        penaltyHome: 3,
        penaltyAway: 4,
      })
    );
    expect(r).toEqual({ winnerCode: "USA", loserCode: "POR", stageKey: "r32" });
  });

  it("returns null (never guesses) when level with no usable penalty score", () => {
    expect(
      knockoutResult(ko({ home: { abbreviation: "POR", score: 1 }, away: { abbreviation: "USA", score: 1 } }))
    ).toBeNull();
    expect(
      knockoutResult(
        ko({
          home: { abbreviation: "POR", score: 1 },
          away: { abbreviation: "USA", score: 1 },
          penaltyHome: 3,
          penaltyAway: 3,
        })
      )
    ).toBeNull();
  });

  it("returns null for a group-stage match or a non-final knockout match", () => {
    expect(knockoutResult(ko({ stage: "Group A" }))).toBeNull();
    expect(knockoutResult(ko({ status: "live" }))).toBeNull();
  });

  it("maps a country to advanced / eliminated / null", () => {
    const g = ko({ home: { abbreviation: "POR", score: 2 }, away: { abbreviation: "USA", score: 1 } });
    expect(countryKnockoutOutcome(g, "POR")).toBe("advanced");
    expect(countryKnockoutOutcome(g, "USA")).toBe("eliminated");
    expect(countryKnockoutOutcome(g, "BRA")).toBeNull(); // not involved
  });
});

describe("nextStageLabel", () => {
  it("names the next round, and Champions after the final", () => {
    expect(nextStageLabel("r32")).toBe("Round of 16");
    expect(nextStageLabel("qf")).toBe("Semifinals");
    expect(nextStageLabel("sf")).toBe("Final");
    expect(nextStageLabel("final")).toBe("Champions");
  });
});

describe("KNOCKOUT_STATIC_DATES", () => {
  it("maps every round key to its scheduled ISO date", () => {
    expect(KNOCKOUT_STATIC_DATES.r32).toBe("2026-06-28T00:00:00Z");
    expect(KNOCKOUT_STATIC_DATES.final).toBe("2026-07-19T00:00:00Z");
    expect(Object.keys(KNOCKOUT_STATIC_DATES).sort()).toEqual([
      "final",
      "qf",
      "r16",
      "r32",
      "sf",
    ]);
  });
});

describe("buildKnockoutPreview", () => {
  it("picks the earliest round with an unplayed match (the one up next)", () => {
    const fixtures = [
      fx({ id: "a", stage: "Round of 32", status: "final",
        away: { name: "USA", abbreviation: "USA", score: 2 },
        home: { name: "Chile", abbreviation: "CHI", score: 1 } }),
      fx({ id: "b", stage: "Round of 16", status: "upcoming",
        away: { name: "USA", abbreviation: "USA", score: 0 },
        home: { name: "Mexico", abbreviation: "MEX", score: 0 } }),
    ];
    const p = buildKnockoutPreview(fixtures, STATIC, "USA");
    expect(p.roundKey).toBe("r16");
    expect(p.roundLabel).toBe("Round of 16");
    expect(p.hasFixtures).toBe(true);
    expect(p.total).toBe(1);
  });

  it("marks the followed side and keeps real matchups tappable", () => {
    const fixtures = [
      fx({ id: "g1", stage: "Round of 16", status: "upcoming",
        away: { name: "United States", abbreviation: "USA", score: 0 },
        home: { name: "Mexico", abbreviation: "MEX", score: 0 } }),
    ];
    const p = buildKnockoutPreview(fixtures, STATIC, "USA");
    const row = p.rows[0];
    expect(row.followedSide).toBe("away");
    expect(row.placeholder).toBe(false);
    expect(row.href).toBe("/game/g1");
  });

  it("keeps ESPN slot placeholders (muted, non-tappable) without fabricating", () => {
    const fixtures = [
      fx({ id: "p1", stage: "Round of 32", status: "upcoming",
        away: { name: "Group E winner", abbreviation: "1E", score: 0 },
        home: { name: "Group G runner-up", abbreviation: "2G", score: 0 } }),
    ];
    const p = buildKnockoutPreview(fixtures, STATIC, "USA");
    const row = p.rows[0];
    expect(row.placeholder).toBe(true);
    expect(row.href).toBe("");
    expect(row.awayCode).toBe("1E");
    expect(row.homeCode).toBe("2G");
  });

  it("flags a level played score (no winner emphasis) and en-dash score line", () => {
    const fixtures = [
      fx({ id: "d1", stage: "Round of 16", status: "final",
        away: { name: "USA", abbreviation: "USA", score: 1 },
        home: { name: "Mexico", abbreviation: "MEX", score: 1 } }),
    ];
    const p = buildKnockoutPreview(fixtures, STATIC, "USA");
    expect(p.rows[0].level).toBe(true);
    expect(p.rows[0].scoreLine).toBe("1 – 1");
  });

  it("falls back to R32 with the static date range when no fixtures exist", () => {
    const p = buildKnockoutPreview([], STATIC, "USA");
    expect(p.roundKey).toBe("r32");
    expect(p.hasFixtures).toBe(false);
    expect(p.rows).toHaveLength(0);
    expect(p.dateRange).toBeTruthy();
  });

  it("caps the preview at the requested limit", () => {
    const fixtures = Array.from({ length: 8 }, (_, i) =>
      fx({ id: `r${i}`, stage: "Round of 32", status: "upcoming",
        away: { name: "A", abbreviation: "USA", score: 0 },
        home: { name: "B", abbreviation: "MEX", score: 0 } }),
    );
    const p = buildKnockoutPreview(fixtures, STATIC, null, 5);
    expect(p.rows).toHaveLength(5);
    expect(p.total).toBe(8);
  });
});

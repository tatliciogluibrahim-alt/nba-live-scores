import { describe, it, expect } from "vitest";
import {
  buildKnockoutRounds,
  roundKeyFromStage,
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

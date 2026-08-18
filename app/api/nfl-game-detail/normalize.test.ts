import { describe, it, expect } from "vitest";
import summary from "./__fixtures__/summary-401873284.json";
import {
  normalizeNFLGameDetail,
  normalizeNFLLeaders,
  normalizeNFLPeriodScores,
  normalizeNFLScoringPlays,
  type ESPNNFLSummary,
} from "./normalize";

// Real captured payload: PHI 7 at BAL 24, preseason week 2, 2026-08-15.
// Cast through unknown: the JSON import widens homeAway to string.
const real = summary as unknown as ESPNNFLSummary;

describe("NFL scoring plays", () => {
  it("reads every scoring play with its running score", () => {
    const plays = normalizeNFLScoringPlays(real);
    expect(plays).toHaveLength(5);
    const first = plays[0];
    expect(first.period).toBe(2);
    expect(first.clock).toBe("9:24");
    expect(first.teamCode).toBe("BAL");
    expect(first.kind).toBe("TD");
    expect(first.awayScore).toBe(0);
    expect(first.homeScore).toBe(7);
  });

  it("trims the extra-point parenthetical off the play text", () => {
    // "…pass from Joe Fagnano (Tyler Loop Kick)" — the kick is already in
    // the running score, and the tail is what overflowed a 390px row.
    const [first] = normalizeNFLScoringPlays(real);
    expect(first.text).toBe("Ja'Kobi Lane 16 Yd pass from Joe Fagnano");
    expect(first.text).not.toContain("(");
  });

  it("the running score ends at the final score", () => {
    const plays = normalizeNFLScoringPlays(real);
    const last = plays[plays.length - 1];
    expect([last.awayScore, last.homeScore]).toEqual([7, 24]);
  });

  it("drops a play with no text rather than rendering an empty row", () => {
    const plays = normalizeNFLScoringPlays({
      scoringPlays: [{ text: "   ", period: { number: 1 } }],
    });
    expect(plays).toEqual([]);
  });

  it("survives an empty or malformed payload", () => {
    expect(normalizeNFLScoringPlays({})).toEqual([]);
    expect(normalizeNFLScoringPlays({ scoringPlays: [] })).toEqual([]);
  });
});

describe("NFL leaders", () => {
  it("returns three offensive categories per team, in reading order", () => {
    const leaders = normalizeNFLLeaders(real);
    expect(leaders).toHaveLength(6);
    expect(leaders.slice(0, 3).map((l) => l.category)).toEqual([
      "Passing",
      "Rushing",
      "Receiving",
    ]);
    const passing = leaders[0];
    expect(passing.teamCode).toBe("BAL");
    expect(passing.name).toBe("J. Fagnano");
    expect(passing.line).toBe("22/28, 224 YDS, 1 TD, 1 INT");
  });

  it("skips the defensive categories the feed also carries", () => {
    // sacks + totalTackles are present in the payload; six rows is the cap
    // of a calm read.
    const leaders = normalizeNFLLeaders(real);
    expect(leaders.some((l) => /sack|tackle/i.test(l.category))).toBe(false);
  });

  it("drops a category with no athlete or no stat line", () => {
    const leaders = normalizeNFLLeaders({
      leaders: [
        {
          team: { abbreviation: "KC" },
          leaders: [
            { name: "passingYards", leaders: [{ displayValue: "200 YDS" }] },
            {
              name: "rushingYards",
              leaders: [{ athlete: { shortName: "I. Pacheco" } }],
            },
          ],
        },
      ],
    });
    expect(leaders).toEqual([]);
  });

  it("ignores a team block with no code (nothing to attribute it to)", () => {
    expect(normalizeNFLLeaders({ leaders: [{ leaders: [] }] })).toEqual([]);
  });
});

describe("NFL per-quarter line", () => {
  it("reads both sides in quarter order", () => {
    expect(normalizeNFLPeriodScores(real)).toEqual({
      away: [0, 0, 0, 7],
      home: [0, 7, 3, 14],
    });
  });

  it("is empty before the first quarter posts", () => {
    expect(normalizeNFLPeriodScores({})).toEqual({ away: [], home: [] });
  });
});

describe("the whole payload", () => {
  it("composes without throwing on a real game", () => {
    const payload = normalizeNFLGameDetail(real);
    expect(payload.scoringPlays).toHaveLength(5);
    expect(payload.leaders).toHaveLength(6);
    expect(payload.periodScores.home).toHaveLength(4);
  });

  it("is honestly empty for an upcoming game", () => {
    expect(normalizeNFLGameDetail({})).toEqual({
      scoringPlays: [],
      leaders: [],
      periodScores: { away: [], home: [] },
    });
  });
});

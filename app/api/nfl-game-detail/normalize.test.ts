import { describe, it, expect } from "vitest";
import summary from "./__fixtures__/summary-401873284.json";
import summaryWeek2 from "./__fixtures__/summary-401872932.json";
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
// Real captured payload: BUF 41 at DET 31, week 2, 2026-09-17. Trimmed to
// header + leaders + scoringPlays. Carries the cases the TD-credit rule
// exists for: Gibbs (rushing leader, scored on a catch), Allen (passing
// leader, ran two in), Cook (rushing leader whose line already says 1 TD).
const week2 = summaryWeek2 as unknown as ESPNNFLSummary;

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

describe("NFL leaders — TD credit the category line omits", () => {
  // ESPN leader lines are category-scoped: a rushing leader's "1 TD" counts
  // rushing TDs only. The scoring plays are the source for the rest.
  const find = (teamCode: string, category: string) =>
    normalizeNFLLeaders(week2).find(
      (l) => l.teamCode === teamCode && l.category === category
    );

  it("credits a rushing leader's receiving TD (Gibbs, 11 yd catch)", () => {
    const gibbs = find("DET", "Rushing");
    expect(gibbs?.name).toBe("J. Gibbs");
    expect(gibbs?.line).toBe("16 CAR, 52 YDS");
    expect(gibbs?.tdNote).toBe("1 receiving TD");
  });

  it("credits a passing leader's rushing TDs (Allen ran two in)", () => {
    const allen = find("BUF", "Passing");
    expect(allen?.line).toBe("20/31, 248 YDS, 3 TD");
    expect(allen?.tdNote).toBe("2 rushing TD");
  });

  it("adds nothing when the line already counts the TD (Cook's rush)", () => {
    const cook = find("BUF", "Rushing");
    expect(cook?.line).toBe("21 CAR, 135 YDS, 1 TD");
    expect(cook?.tdNote).toBeUndefined();
  });

  it("a QB who is also the rushing leader gets his passing TD on the rushing row", () => {
    // Preseason fixture: Payton leads PHI in passing AND rushing. His rushing
    // line has no TD, his one TD was a throw.
    const rows = normalizeNFLLeaders(real).filter((l) => l.name === "C. Payton");
    expect(rows.map((r) => r.category)).toEqual(["Passing", "Rushing"]);
    expect(rows[0].tdNote).toBeUndefined();
    expect(rows[1].tdNote).toBe("1 passing TD");
  });

  it("lists several categories in reading order (passing, rushing, receiving, return)", () => {
    const leaders = normalizeNFLLeaders({
      leaders: [
        {
          team: { abbreviation: "SF" },
          leaders: [
            {
              name: "rushingYards",
              leaders: [
                {
                  displayValue: "10 CAR, 40 YDS",
                  athlete: { shortName: "C. McCaffrey", displayName: "Christian McCaffrey" },
                },
              ],
            },
          ],
        },
      ],
      scoringPlays: [
        { type: { abbreviation: "TD" }, text: "Christian McCaffrey 98 Yd Kickoff Return (Kick)" },
        { type: { abbreviation: "TD" }, text: "Christian McCaffrey 6 Yd pass from Brock Purdy (Kick)" },
        { type: { abbreviation: "TD" }, text: "Christian McCaffrey 12 Yd pass from Brock Purdy (Kick)" },
      ],
    });
    expect(leaders[0].tdNote).toBe("2 receiving TD, 1 return TD");
  });

  it("never credits on a partial or abbreviated name match", () => {
    const leaders = normalizeNFLLeaders({
      leaders: [
        {
          team: { abbreviation: "DET" },
          leaders: [
            {
              name: "rushingYards",
              leaders: [
                {
                  displayValue: "16 CAR, 52 YDS",
                  athlete: { shortName: "J. Gibbs", displayName: "Jahmyr Gibbs" },
                },
              ],
            },
          ],
        },
      ],
      scoringPlays: [
        { type: { abbreviation: "TD" }, text: "J. Gibbs 11 Yd pass from Jared Goff (Kick)" },
        { type: { abbreviation: "TD" }, text: "Jahmyr Gibbs Jr. 3 Yd Rush (Kick)" },
      ],
    });
    expect(leaders[0].tdNote).toBeUndefined();
  });

  it("ignores field goals and two-point tries", () => {
    const leaders = normalizeNFLLeaders({
      leaders: [
        {
          team: { abbreviation: "DET" },
          leaders: [
            {
              name: "receivingYards",
              leaders: [
                {
                  displayValue: "5 REC, 60 YDS",
                  athlete: { shortName: "A. St. Brown", displayName: "Amon-Ra St. Brown" },
                },
              ],
            },
          ],
        },
      ],
      scoringPlays: [
        { type: { abbreviation: "FG" }, text: "Amon-Ra St. Brown 31 Yd Field Goal" },
        { type: { abbreviation: "2PT" }, text: "Amon-Ra St. Brown Pass From Jared Goff" },
      ],
    });
    expect(leaders[0].tdNote).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { liveLine, nflPeriodLine, nbaPeriodLine, type LiveLineGame } from "./live-line";

// Today's lead deck under a live score (persona sweep, 2026-10-11).
// Margin wording ("One-score game.", "One-possession game.", "Final minutes
// are close.") says how close the game is, so a game hidden by No-Spoilers
// must never get it: hidden games get the neutral period line. The
// situation line replaces the generic period line when the game is shown.

function nfl(over: Partial<LiveLineGame> = {}): LiveLineGame {
  return {
    source: "nfl",
    statusLine: "Q4 6:12",
    period: 4,
    awayScore: 13,
    homeScore: 17,
    ...over,
  };
}

function nba(over: Partial<LiveLineGame> = {}): LiveLineGame {
  return {
    source: "nba",
    statusLine: "Q4 · 2:14",
    period: 4,
    awayScore: 96,
    homeScore: 94,
    ...over,
  };
}

const IND_RED_ZONE = { possession: "IND", downDistance: "1st & Goal at PIT 3", redZone: true };

describe("liveLine — No-Spoilers never gets margin wording", () => {
  it("a hidden one-score NFL game reads the period line", () => {
    expect(liveLine(nfl(), true)).toEqual({ line: "Fourth quarter underway.", situation: null });
  });

  it("the same game shown reads One-score game.", () => {
    expect(liveLine(nfl(), false).line).toBe("One-score game.");
  });

  it("a hidden one-possession NBA game reads the period line", () => {
    expect(liveLine(nba(), true).line).toBe("Fourth quarter underway.");
    expect(liveLine(nba(), false).line).toBe("One-possession game.");
  });

  it("a hidden close NBA finish reads the period line", () => {
    const close = nba({ awayScore: 90, homeScore: 95 });
    expect(liveLine(close, false).line).toBe("Final minutes are close.");
    expect(liveLine(close, true).line).toBe("Fourth quarter underway.");
  });

  it("no hidden line ever carries closeness, at any period or margin", () => {
    const margin = /one-score|one-possession|close/i;
    for (const period of [1, 2, 3, 4, 5]) {
      for (const diff of [0, 1, 3, 6, 8, 20]) {
        const statusLine = period >= 5 ? "OT 8:00" : `Q${period} 1:00`;
        const nflHidden = liveLine(nfl({ period, statusLine, awayScore: 10, homeScore: 10 + diff }), true);
        expect(nflHidden.line).not.toMatch(margin);
        const nbaLine = period >= 5 ? "OT · 1:00" : `Q${period} · 1:00`;
        const nbaHidden = liveLine(
          nba({ period, statusLine: nbaLine, awayScore: 90, homeScore: 90 + diff }),
          true
        );
        expect(nbaHidden.line).not.toMatch(margin);
      }
    }
  });
});

describe("liveLine — the NFL situation line", () => {
  it("replaces the generic period line when the game is shown", () => {
    const g = nfl({ statusLine: "Q3 12:08", period: 3, situation: IND_RED_ZONE });
    expect(liveLine(g, false)).toEqual({
      line: "",
      situation: { text: "IND ball · 1st & Goal at PIT 3", redZone: true },
    });
  });

  it("keeps the margin wording beside it (not a period line)", () => {
    const g = nfl({ situation: IND_RED_ZONE });
    expect(liveLine(g, false)).toEqual({
      line: "One-score game.",
      situation: { text: "IND ball · 1st & Goal at PIT 3", redZone: true },
    });
  });

  it("is gone for a hidden game, not even possession", () => {
    const g = nfl({ statusLine: "Q3 12:08", period: 3, situation: IND_RED_ZONE });
    expect(liveLine(g, true)).toEqual({ line: "Third quarter underway.", situation: null });
  });
});

describe("liveLine — no bare 'Game is live.'", () => {
  it("the first quarter says so", () => {
    expect(liveLine(nfl({ statusLine: "Q1 9:41", period: 1 }), false).line).toBe(
      "First quarter underway."
    );
    expect(liveLine(nba({ statusLine: "Q1 · 9:41", period: 1 }), false).line).toBe(
      "First quarter underway."
    );
  });

  it("never falls back to Game is live.", () => {
    for (const period of [0, 1, 2, 3, 4, 5]) {
      expect(liveLine(nfl({ period, statusLine: "Live", awayScore: 0, homeScore: 30 }), false).line).not.toMatch(/game is live/i);
      expect(liveLine(nba({ period, statusLine: "Live", awayScore: 0, homeScore: 30 }), false).line).not.toMatch(/game is live/i);
    }
  });
});

describe("nflPeriodLine", () => {
  const cases: [string, number, string][] = [
    ["Q1 15:00", 1, "First quarter underway."],
    ["Q2 7:30", 2, "Second quarter underway."],
    ["End of 1st", 2, "End of the first quarter."],
    ["End of 1st", 1, "End of the first quarter."],
    ["Halftime", 2, "Halftime."],
    ["Q3 15:00", 3, "Third quarter underway."],
    ["End of 3rd", 4, "End of the third quarter."],
    ["Q4 0:41", 4, "Fourth quarter underway."],
    ["End of 4th", 4, "End of regulation."],
    ["OT 8:00", 5, "Overtime."],
  ];
  for (const [status, period, want] of cases) {
    it(`"${status}" (period ${period}) → ${want}`, () => {
      expect(nflPeriodLine(status, period)).toBe(want);
    });
  }

  it("a break is never read as the next quarter underway", () => {
    // The flip holds period 2 while ESPN says the 1st just ended.
    expect(nflPeriodLine("End of 1st", 2)).not.toMatch(/second quarter/i);
  });

  it("no margin wording at a break, even late and level", () => {
    const g = nfl({ statusLine: "End of 4th", period: 4, awayScore: 20, homeScore: 20 });
    expect(liveLine(g, false).line).toBe("End of regulation.");
    const flip = nfl({ statusLine: "End of 3rd", period: 4, awayScore: 20, homeScore: 17 });
    expect(liveLine(flip, false).line).toBe("End of the third quarter.");
  });
});

describe("nbaPeriodLine", () => {
  const cases: [string, number, string][] = [
    ["Q1 · 11:02", 1, "First quarter underway."],
    ["End Q1", 1, "End of the first quarter."],
    ["End Q2", 2, "Halftime."],
    ["Q3 · 4:21", 3, "Third quarter underway."],
    ["End Q3", 3, "End of the third quarter."],
    ["End Q4", 4, "End of regulation."],
    ["OT · 2:11", 5, "Overtime."],
    ["2OT · 0:45", 6, "Overtime."],
  ];
  for (const [status, period, want] of cases) {
    it(`"${status}" (period ${period}) → ${want}`, () => {
      expect(nbaPeriodLine(status, period)).toBe(want);
    });
  }
});

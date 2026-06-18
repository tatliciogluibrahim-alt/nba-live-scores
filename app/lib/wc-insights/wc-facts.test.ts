import { describe, it, expect } from "vitest";
import { buildWCFactsFromGame } from "./wc-facts";
import { rankSignals } from "../narrative/significance";
import { validateNarrative } from "../narrative/validate";
import type { WCGameLite, WCMatchEventLite } from "../../companion/today/today-data";

function goal(player: string, teamId: string): WCMatchEventLite {
  return { minute: "23'", type: "goal", playerName: player, teamId };
}

function match(
  over: Partial<WCGameLite> & {
    awayScore: number;
    homeScore: number;
    events?: WCMatchEventLite[];
  }
): WCGameLite {
  return {
    id: "wc-1",
    date: "2026-06-18T19:00Z",
    status: "final",
    statusText: "FT",
    stage: "Group A",
    group: "A",
    home: { id: "h", name: "South Africa", abbreviation: "RSA", score: over.homeScore },
    away: { id: "a", name: "Mexico", abbreviation: "MEX", score: over.awayScore },
    events: over.events ?? [],
    broadcasts: [],
    watchLabel: "",
    ...over,
  } as WCGameLite;
}

describe("buildWCFactsFromGame", () => {
  it("extracts score, winner, margin, and scorers (away-then-home)", () => {
    const facts = buildWCFactsFromGame(
      match({ awayScore: 2, homeScore: 0, events: [goal("Gimenez", "a"), goal("Gimenez", "a")] })
    )!;
    expect(facts.sport).toBe("wc");
    expect(facts.winnerCode).toBe("MEX");
    expect(facts.margin).toBe(2);
    expect(facts.scorers).toEqual([{ name: "Gimenez", team: "MEX", goals: 2 }]);
    // Scores, margin, total, and the brace count are all grounded.
    expect(facts.groundedNumbers).toContain(2);
    expect(facts.groundedNumbers).toContain(0);
  });

  it("returns null for a non-final match", () => {
    expect(buildWCFactsFromGame(match({ awayScore: 0, homeScore: 0, status: "live" }))).toBeNull();
  });

  it("credits a draw with no winner", () => {
    const facts = buildWCFactsFromGame(match({ awayScore: 1, homeScore: 1 }))!;
    expect(facts.winnerCode).toBeNull();
    expect(facts.margin).toBe(0);
  });
});

describe("WC significance signals", () => {
  it("leads with a hat-trick", () => {
    const facts = buildWCFactsFromGame(
      match({ awayScore: 3, homeScore: 1, events: [goal("X", "a"), goal("X", "a"), goal("X", "a")] })
    )!;
    expect(rankSignals(facts)[0].kind).toBe("hat-trick");
  });

  it("flags a goalless draw as a stalemate", () => {
    const facts = buildWCFactsFromGame(match({ awayScore: 0, homeScore: 0 }))!;
    expect(rankSignals(facts).some((s) => s.kind === "stalemate")).toBe(true);
  });

  it("leads with advancement when the stake says so", () => {
    const facts = buildWCFactsFromGame(
      match({ awayScore: 1, homeScore: 0 }),
      "Mexico are through to the Round of 32."
    )!;
    expect(rankSignals(facts)[0].kind).toBe("decider");
  });
});

describe("validation grounds WC numbers", () => {
  it("rejects a score the facts don't contain", () => {
    const facts = buildWCFactsFromGame(match({ awayScore: 2, homeScore: 0 }))!;
    expect(validateNarrative("Mexico won 2-0.", facts).ok).toBe(true);
    expect(validateNarrative("Mexico won 5-1.", facts).ok).toBe(false);
  });
});

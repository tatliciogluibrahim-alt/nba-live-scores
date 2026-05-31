import { describe, it, expect } from "vitest";
import { rankSignals } from "./significance";
import { validateNarrative } from "./validate";
import { generateValidated } from "./generate";
import type { GameFacts } from "./types";

function facts(overrides: Partial<GameFacts> = {}): GameFacts {
  return {
    gameId: "g1",
    sport: "nba",
    status: "final",
    away: { code: "OKC", name: "Oklahoma City", score: 103 },
    home: { code: "SA", name: "San Antonio", score: 111 },
    winnerCode: "SA",
    loserCode: "OKC",
    margin: 8,
    seriesLine: null,
    seriesUrgent: false,
    topPerformer: { name: "Wembanyama", team: "SA", pts: 32, ast: 5, reb: 12 },
    groundedNumbers: [103, 111, 8, 32, 5, 12],
    ...overrides,
  };
}

describe("rankSignals", () => {
  it("returns nothing for non-final games", () => {
    expect(rankSignals(facts({ status: "live" }))).toEqual([]);
  });

  it("ranks Game 7 highest", () => {
    const s = rankSignals(
      facts({ seriesUrgent: true, seriesLine: "Game 7. The title is on the line." })
    );
    expect(s[0].kind).toBe("game7");
  });

  it("treats an urgent non-Game-7 series as a clinch", () => {
    const s = rankSignals(
      facts({ seriesUrgent: true, seriesLine: "SA can reach the Finals with a win." })
    );
    expect(s[0].kind).toBe("clinch");
  });

  it("flags a 40-point night above a routine final", () => {
    const s = rankSignals(
      facts({ topPerformer: { name: "X", team: "SA", pts: 41, ast: 3, reb: 6 } })
    );
    expect(s.some((x) => x.kind === "career-night" && x.weight === 70)).toBe(true);
  });

  it("flags a nail-biter on a tight margin", () => {
    const s = rankSignals(facts({ margin: 3 }));
    expect(s.some((x) => x.kind === "nail-biter")).toBe(true);
  });

  it("falls back to routine when nothing stands out", () => {
    const s = rankSignals(
      facts({ margin: 10, topPerformer: { name: "X", team: "SA", pts: 18, ast: 2, reb: 3 } })
    );
    expect(s[0].kind).toBe("routine");
  });
});

describe("validateNarrative", () => {
  it("passes a clean grounded line", () => {
    const v = validateNarrative("San Antonio took it by 8. Wembanyama had 32.", facts());
    expect(v.ok).toBe(true);
  });

  it("rejects an ungrounded number (hallucinated stat)", () => {
    const v = validateNarrative("Wembanyama poured in 45 points.", facts());
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/ungrounded/);
  });

  it("rejects em-dashes", () => {
    const v = validateNarrative("San Antonio won by 8 — a clean finish.", facts());
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/em-dash/);
  });

  it("rejects exclamation points", () => {
    const v = validateNarrative("San Antonio won by 8!", facts());
    expect(v.ok).toBe(false);
  });

  it("rejects hype words", () => {
    const v = validateNarrative("An incredible night for San Antonio.", facts());
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/hype/);
  });
});

describe("generateValidated", () => {
  it("bails immediately when the pilot is off (no network call)", async () => {
    const r = await generateValidated(facts(), rankSignals(facts()), "off");
    expect(r.text).toBeNull();
    expect(r.attempts).toBe(1);
    expect(r.lastReasons).toContain("no-generation");
  });
});

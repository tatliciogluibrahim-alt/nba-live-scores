import { describe, it, expect } from "vitest";
import { winnerCodeOf, deriveChampionFromFixtures } from "./wc-champion";
import type { WCScheduleFixture } from "../api/world-cup/schedule/route";

function fixture(
  over: {
    id?: string;
    date?: string;
    status?: WCScheduleFixture["status"];
    stage?: string;
    away?: Partial<WCScheduleFixture["away"]>;
    home?: Partial<WCScheduleFixture["home"]>;
  } = {}
): WCScheduleFixture {
  return {
    id: over.id ?? "900",
    date: over.date ?? "2026-07-19T19:00Z",
    status: over.status ?? "final",
    statusText: "",
    stage: over.stage ?? "final",
    group: "",
    home: {
      name: "Spain",
      abbreviation: "ESP",
      score: 0,
      ...(over.home ?? {}),
    },
    away: {
      name: "France",
      abbreviation: "FRA",
      score: 0,
      ...(over.away ?? {}),
    },
    broadcasts: [],
  };
}

describe("winnerCodeOf", () => {
  it("uses ESPN's winner flag (penalty-aware, level scoreline)", () => {
    expect(
      winnerCodeOf(
        fixture({ home: { winner: true, score: 1 }, away: { score: 1 } })
      )
    ).toBe("ESP");
    expect(
      winnerCodeOf(
        fixture({ away: { winner: true, score: 1 }, home: { score: 1 } })
      )
    ).toBe("FRA");
  });

  it("falls back to a decisive scoreline when no flag", () => {
    expect(winnerCodeOf(fixture({ home: { score: 2 }, away: { score: 0 } }))).toBe(
      "ESP"
    );
    expect(winnerCodeOf(fixture({ home: { score: 0 }, away: { score: 3 } }))).toBe(
      "FRA"
    );
  });

  it("returns null when level with no flag (never guesses)", () => {
    expect(
      winnerCodeOf(fixture({ home: { score: 1 }, away: { score: 1 } }))
    ).toBeNull();
  });

  it("returns null when the match is not final", () => {
    expect(
      winnerCodeOf(
        fixture({ status: "upcoming", home: { score: 0 }, away: { score: 0 } })
      )
    ).toBeNull();
  });
});

describe("deriveChampionFromFixtures", () => {
  const NOW = 1_752_000_000_000;

  it("returns the champion from a decided final-stage final", () => {
    const champ = deriveChampionFromFixtures(
      [
        fixture({ stage: "quarterfinals", home: { score: 2 }, away: { score: 0 } }),
        fixture({
          id: "999",
          stage: "final",
          home: { winner: true, score: 2 },
          away: { score: 1 },
        }),
      ],
      NOW
    );
    expect(champ).toEqual({
      code: "ESP",
      name: "Spain",
      gameId: "999",
      awayCode: "FRA",
      homeCode: "ESP",
      decidedAt: NOW,
    });
  });

  it("is null while the final is still upcoming", () => {
    expect(
      deriveChampionFromFixtures([fixture({ stage: "final", status: "upcoming" })], NOW)
    ).toBeNull();
  });

  it("is null when no final-stage fixture exists", () => {
    expect(
      deriveChampionFromFixtures(
        [fixture({ stage: "quarterfinals", home: { score: 2 }, away: { score: 0 } })],
        NOW
      )
    ).toBeNull();
  });

  it("ignores the third-place match (not the final)", () => {
    expect(
      deriveChampionFromFixtures(
        [fixture({ stage: "3rd Place", home: { score: 2 }, away: { score: 0 } })],
        NOW
      )
    ).toBeNull();
  });
});

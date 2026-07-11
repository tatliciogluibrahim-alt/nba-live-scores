import { describe, it, expect } from "vitest";
import { normalizeFixture } from "./normalize";

// Stage integrity (found in the 2026-07-11 final-week live verify). ESPN
// swaps a decided match's note headline for an outcome line ("Paraguay
// advance 4-3 on penalties"), which is not a round name. If that string
// becomes `stage`, roundKeyFromStage returns null and the match vanishes
// from the bracket, BY DAY, and the third-place round. The season slug
// names the round reliably — it must win.

type EventInput = Parameters<typeof normalizeFixture>[0];

function espnEvent(over: Partial<EventInput> = {}): EventInput {
  return {
    id: "701",
    date: "2026-07-14T19:00Z",
    season: { slug: "semifinals" },
    status: { type: { state: "post", completed: true } },
    competitions: [
      {
        date: "2026-07-14T19:00Z",
        competitors: [
          {
            homeAway: "home",
            score: "1",
            team: { displayName: "Germany", abbreviation: "GER" },
          },
          {
            homeAway: "away",
            score: "1",
            team: { displayName: "Paraguay", abbreviation: "PAR" },
          },
        ],
      },
    ],
    ...over,
  };
}

describe("normalizeFixture — stage derivation", () => {
  it("prefers the round slug over a penalty-outcome note headline", () => {
    const event = espnEvent();
    event.competitions![0].notes = [
      { headline: "Paraguay advance 4-3 on penalties" },
    ];
    expect(normalizeFixture(event)?.stage).toBe("semifinals");
  });

  it("falls back to the note headline when the slug is empty", () => {
    const event = espnEvent({ season: { slug: "" } });
    event.competitions![0].notes = [{ headline: "Semifinal" }];
    expect(normalizeFixture(event)?.stage).toBe("Semifinal");
  });

  it("keeps the group label for true group-stage matches", () => {
    const event = espnEvent();
    event.competitions![0].competitors = [
      {
        homeAway: "home",
        score: "0",
        team: { displayName: "Mexico", abbreviation: "MEX" },
      },
      {
        homeAway: "away",
        score: "0",
        team: { displayName: "South Korea", abbreviation: "KOR" },
      },
    ];
    expect(normalizeFixture(event)?.stage).toBe("Group A");
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeNFLGame, type ESPNNFLEvent } from "./normalize";

// Fixture is a REAL ESPN capture (2026-07-20), trimmed to the fields the
// normalizer reads — the WC 100-cap lesson: test against observed shape.
const fixture = JSON.parse(
  readFileSync(
    new URL("./__fixtures__/week1-scoreboard.json", import.meta.url),
    "utf8"
  )
) as { season: { type: number }; week: { number: number }; events: ESPNNFLEvent[] };

const WEEK = fixture.week.number;
const SEASON_TYPE = fixture.season.type;

describe("normalizeNFLGame — against the real Week-1 capture", () => {
  it("normalizes the opener (SEA v NE, pre-game, NBC)", () => {
    const g = normalizeNFLGame(fixture.events[0], WEEK, SEASON_TYPE)!;
    expect(g.id).toBe("401872656");
    expect(g.status).toBe("upcoming");
    expect(g.statusText).toBe("Upcoming");
    expect(g.week).toBe(1);
    expect(g.seasonType).toBe(2); // regular season
    expect(g.period).toBe(0);
    expect(g.home.abbreviation).toBe("SEA");
    expect(g.away.abbreviation).toBe("NE");
    expect(g.home.score).toBe(0);
    expect(g.broadcasts).toContain("NBC");
  });

  it("normalizes every fixture event without throwing", () => {
    const games = fixture.events.map((e) =>
      normalizeNFLGame(e, WEEK, SEASON_TYPE)
    );
    expect(games.every((g) => g !== null)).toBe(true);
    expect(games).toHaveLength(3);
  });
});

describe("normalizeNFLGame — synthetic states", () => {
  function ev(stateOver: { state?: string } = {}): ESPNNFLEvent {
    return {
      id: "1",
      date: "2026-09-13T17:00Z",
      competitions: [
        {
          date: "2026-09-13T17:00Z",
          status: {
            period: 3,
            displayClock: "8:24",
            type: { state: "in", ...stateOver },
          },
          competitors: [
            { homeAway: "home", score: "17", team: { abbreviation: "KC", displayName: "Kansas City Chiefs" } },
            { homeAway: "away", score: "14", team: { abbreviation: "BUF", displayName: "Buffalo Bills" } },
          ],
        },
      ],
    };
  }

  it("live → Q<period> <clock>", () => {
    const g = normalizeNFLGame(ev(), 2, 2)!;
    expect(g.status).toBe("live");
    expect(g.statusText).toBe("Q3 8:24");
    expect(g.period).toBe(3);
  });

  it("final carries the winner flag", () => {
    const g = normalizeNFLGame(
      {
        id: "2",
        competitions: [
          {
            status: { type: { state: "post", completed: true, detail: "Final" } },
            competitors: [
              { homeAway: "home", score: "27", winner: true, team: { abbreviation: "KC" } },
              { homeAway: "away", score: "24", winner: false, team: { abbreviation: "BUF" } },
            ],
          },
        ],
      },
      2,
      2
    )!;
    expect(g.status).toBe("final");
    expect(g.statusText).toBe("Final");
    expect(g.home.winner).toBe(true);
    expect(g.away.winner).toBe(false);
  });

  it("overtime reads OT, not Q5", () => {
    const otEvent = ev();
    otEvent.competitions![0].status!.period = 5;
    const ot = normalizeNFLGame(otEvent, 2, 2)!;
    expect(ot.statusText).toBe("OT 8:24");
  });

  it("returns null for an event with no competition or id", () => {
    expect(normalizeNFLGame({ id: "3" }, 2, 2)).toBeNull();
    expect(normalizeNFLGame({ competitions: [{}] }, 2, 2)).toBeNull();
  });
});

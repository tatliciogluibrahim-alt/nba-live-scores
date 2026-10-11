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

  it("halftime reads Halftime, not Q2 0:00 (ESPN, PHI at CHI, 2026-09-28)", () => {
    // The real status ESPN served for all 15 minutes of halftime: period 2,
    // clock 0:00, STATUS_HALFTIME. The old text read "Q2 0:00" on every
    // row and on the lock screen for the whole break.
    const half = ev();
    half.competitions![0].status = {
      period: 2,
      displayClock: "0:00",
      type: {
        state: "in",
        completed: false,
        name: "STATUS_HALFTIME",
        description: "Halftime",
        detail: "Halftime",
        shortDetail: "Halftime",
      },
    };
    const g = normalizeNFLGame(half, 3, 2)!;
    expect(g.status).toBe("live");
    expect(g.period).toBe(2);
    expect(g.statusText).toBe("Halftime");
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

// ── Week 5 live captures (2026-10-11) ──────────────────────────────────
// REAL ESPN scoreboard snapshots taken during the 1 PM and 4 PM windows,
// trimmed to the fields the normalizer reads (values verbatim). See
// scripts/fixtures/nfl-week5-2026-live-1011.json.
type Capture = {
  capturedAt: string;
  season: { type: number };
  week: { number: number };
  events: ESPNNFLEvent[];
};
const week5 = JSON.parse(
  readFileSync(
    new URL("../../../scripts/fixtures/nfl-week5-2026-live-1011.json", import.meta.url),
    "utf8"
  )
) as { captures: Capture[] };

/** One event from a capture, normalized the way route.ts does it. */
function captured(capturedAt: string, id: string) {
  const cap = week5.captures.find((c) => c.capturedAt === capturedAt);
  if (!cap) throw new Error(`no capture at ${capturedAt}`);
  const ev = cap.events.find((e) => e.id === id);
  if (!ev) throw new Error(`no event ${id} at ${capturedAt}`);
  return normalizeNFLGame(ev, cap.week.number, cap.season.type)!;
}

const T1439 = "2026-10-11T14:39:48-04:00";
const T1447 = "2026-10-11T14:47:35-04:00";

describe("normalizeNFLGame — live situation (Week 5 captures)", () => {
  it("resolves possession to the offense's code through the competitors", () => {
    // CHI at GB, 13:25 3rd: ESPN possession "9" is GB's team id.
    const g = captured(T1439, "401872990");
    expect(g.statusText).toBe("Q3 13:25");
    expect(g.clock).toBe("13:25");
    expect(g.situation).toEqual({
      possession: "GB",
      downDistance: "3rd & 12 at CHI 43",
      redZone: false,
    });
  });

  it("carries the red zone flag with goal-to-go", () => {
    // IND at PIT, 12:08 3rd: "1st & Goal at PIT 3", isRedZone true.
    const g = captured(T1447, "401872985");
    expect(g.situation).toEqual({
      possession: "IND",
      downDistance: "1st & Goal at PIT 3",
      redZone: true,
    });
  });

  it("keeps the spot but names no offense when ESPN has no possession", () => {
    // HOU at TEN right after the second-half kickoff: a spot, no possession.
    const g = captured(T1439, "401872984");
    expect(g.situation).toEqual({ downDistance: "1st & 10 at HOU 26", redZone: false });
    expect(g.situation).not.toHaveProperty("possession");
  });

  it("has no situation during an official timeout, even with a stale red-zone flag", () => {
    // MIN at NO: ESPN drops downDistanceText for the timeout but keeps
    // isRedZone true. No down and distance means no line at all.
    const g = captured(T1439, "401872987");
    expect(g.status).toBe("live");
    expect(g.situation).toBeUndefined();
  });

  it("has no situation right after a touchdown", () => {
    // LV at NE, the Maye TD: lastPlay is the score, no down and distance.
    const g = captured(T1447, "401872986");
    expect(g.situation).toBeUndefined();
  });

  it("has no situation at halftime (ESPN leaves a stale red-zone flag)", () => {
    const g = captured(T1439, "401872985");
    expect(g.statusText).toBe("Halftime");
    expect(g.situation).toBeUndefined();
  });

  it("finals carry no situation and no clock", () => {
    const g = captured(T1439, "401872981");
    expect(g.status).toBe("final");
    expect(g.situation).toBeUndefined();
    expect(g.clock).toBeUndefined();
  });
});

describe("normalizeNFLGame — break states read as breaks (MIN at NO, end of the 3rd)", () => {
  // The real sequence ESPN served at the end of the 3rd quarter:
  //   15:05:40  STATUS_END_PERIOD "End of 3rd", 0:00, period 3
  //   15:05:56  flips to "15:00 - 4th", lastPlay still "END QUARTER 3",
  //             held for over three minutes
  //   15:09:14  first 4th-quarter play while the clock still read 15:00
  //   15:10:00  the clock caught up, "14:06 - 4th"
  // The old text read "Q3 0:00" and then "Q4 15:00" for the whole break.

  it("ESPN's end-of-period state reads End of 3rd", () => {
    const g = captured("2026-10-11T15:05:40-04:00", "401872987");
    expect(g.statusText).toBe("End of 3rd");
    expect(g.period).toBe(3);
  });

  it("the flip to 15:00 of the 4th still reads End of 3rd", () => {
    const g = captured("2026-10-11T15:06:26-04:00", "401872987");
    expect(g.period).toBe(4);
    expect(g.clock).toBe("15:00");
    expect(g.statusText).toBe("End of 3rd");
  });

  it("the drive carries over the break, so its situation stays", () => {
    expect(captured("2026-10-11T15:06:26-04:00", "401872987").situation).toEqual({
      possession: "MIN",
      downDistance: "3rd & 1 at NO 10",
      redZone: true,
    });
  });

  it("a 4th-quarter play ends the break even while ESPN's clock still reads 15:00", () => {
    const g = captured("2026-10-11T15:09:14-04:00", "401872987");
    expect(g.statusText).toBe("Q4 15:00");
    expect(g.situation?.downDistance).toBe("1st & Goal at NO 8");
  });

  it("once the clock moves it's the ordinary clock again", () => {
    expect(captured("2026-10-11T15:10:00-04:00", "401872987").statusText).toBe("Q4 14:06");
  });

  it("15:00 of the 3rd is play, not a break (the second half opens with a kickoff)", () => {
    // HOU at TEN: "15:00 - 3rd" with the kickoff as last play.
    expect(captured(T1439, "401872984").statusText).toBe("Q3 15:00");
  });
});

describe("normalizeNFLGame — break states, end of the 1st and halftime", () => {
  // The same two shapes after the 1st quarter (MNF PHI at CHI, 2026-09-28,
  // .replay/live/mnf-2026-09-28.jsonl: "15:00 - 2nd" held 4.4 minutes).
  // lastPlay follows the Week 5 captures' end-of-period marker.
  function liveStatus(
    period: number,
    displayClock: string,
    shortDetail: string,
    name = "STATUS_IN_PROGRESS",
    lastPlay?: { type: { text: string }; text: string }
  ) {
    const e: ESPNNFLEvent = {
      id: "401872963",
      date: "2026-09-29T00:15Z",
      competitions: [
        {
          date: "2026-09-29T00:15Z",
          status: {
            period,
            displayClock,
            type: { state: "in", completed: false, name, shortDetail },
          },
          competitors: [
            { homeAway: "home", score: "7", team: { abbreviation: "CHI" } },
            { homeAway: "away", score: "0", team: { abbreviation: "PHI" } },
          ],
          ...(lastPlay ? { situation: { lastPlay } } : {}),
        },
      ],
    };
    return normalizeNFLGame(e, 4, 2)!;
  }
  const END_Q1 = { type: { text: "End Period" }, text: "END QUARTER 1" };

  it("ESPN's end-of-period state reads End of 1st", () => {
    expect(liveStatus(1, "0:00", "End of 1st", "STATUS_END_PERIOD").statusText).toBe("End of 1st");
  });

  it("the flip to 15:00 of the 2nd reads End of 1st", () => {
    expect(liveStatus(2, "15:00", "15:00 - 2nd", undefined, END_Q1).statusText).toBe("End of 1st");
  });

  it("the first snap ends the break", () => {
    expect(liveStatus(2, "14:55", "14:55 - 2nd", undefined, END_Q1).statusText).toBe("Q2 14:55");
  });

  it("Halftime stays exactly Halftime (scan-nfl and the Live Activity key off it)", () => {
    expect(liveStatus(2, "0:00", "Halftime", "STATUS_HALFTIME").statusText).toBe("Halftime");
  });
});

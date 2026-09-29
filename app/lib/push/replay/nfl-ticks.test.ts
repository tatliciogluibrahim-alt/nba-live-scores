import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildNFLTimeline } from "./nfl-ticks";
import type { ReplayPlay, ReplaySummary } from "./nfl-summary";
import type { NFLScoringPlay } from "../nfl-play-detector";

const FIXTURES = join(__dirname, "__fixtures__");
const fixture = (name: string): ReplaySummary =>
  JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));

const T0 = Date.parse("2026-09-28T17:00:00Z");
const at = (sec: number) => new Date(T0 + sec * 1000).toISOString();

type P = Partial<ReplayPlay> & { id: string; sec?: number | null };
function play(p: P): ReplayPlay {
  const { sec, ...rest } = p;
  return {
    period: { number: 1 },
    type: { text: "Rush" },
    awayScore: 0,
    homeScore: 0,
    ...(sec === null || sec === undefined ? {} : { wallclock: at(sec) }),
    ...rest,
  };
}

function summary(
  drives: [string, P[]][],
  scoringPlays: NFLScoringPlay[] = []
): ReplaySummary {
  return {
    header: {
      id: "g1",
      competitions: [
        {
          competitors: [
            { homeAway: "home", team: { abbreviation: "BUF" } },
            { homeAway: "away", team: { abbreviation: "DET" } },
          ],
        },
      ],
    },
    drives: {
      previous: drives.map(([team, plays]) => ({
        team: { abbreviation: team },
        plays: plays.map(play),
      })),
    },
    scoringPlays,
  };
}

const TD: NFLScoringPlay = {
  id: "p3",
  type: { abbreviation: "TD" },
  scoringType: { name: "touchdown" },
  text: "Josh Allen 1 Yd Rush (Tyler Bass Kick)",
  awayScore: 0,
  homeScore: 7,
  team: { abbreviation: "BUF" },
};

describe("buildNFLTimeline", () => {
  it("reads both teams from the header", () => {
    const tl = buildNFLTimeline(summary([["BUF", [{ id: "p1", sec: 0 }]]]));
    expect(tl.gameId).toBe("g1");
    expect(tl.awayCode).toBe("DET");
    expect(tl.homeCode).toBe("BUF");
  });

  it("opens with an upcoming tick and closes on the first final tick", () => {
    const tl = buildNFLTimeline(
      summary([
        [
          "BUF",
          [
            { id: "p1", sec: 30, type: { text: "Kickoff" } },
            { id: "p2", sec: 90 },
            { id: "end", sec: 200, type: { text: "End of Game" } },
          ],
        ],
      ])
    );
    const first = tl.ticks[0];
    const last = tl.ticks[tl.ticks.length - 1];
    expect(first.atMs).toBeLessThan(T0 + 30_000);
    expect(first.fresh.status).toBe("upcoming");
    expect(first.fresh.period).toBe(0);
    expect(tl.ticks[1].fresh.status).toBe("live");
    expect(last.fresh.status).toBe("final");
    expect(tl.ticks.filter((t) => t.fresh.status === "final")).toHaveLength(1);
  });

  it("ticks on a fixed 60s grid", () => {
    const tl = buildNFLTimeline(
      summary([["BUF", [{ id: "p1", sec: 30 }, { id: "end", sec: 400, type: { text: "End of Game" } }]]])
    );
    for (let i = 1; i < tl.ticks.length; i++) {
      expect(tl.ticks[i].atMs - tl.ticks[i - 1].atMs).toBe(60_000);
    }
  });

  it("gives a play with no wallclock the previous visible time", () => {
    const tl = buildNFLTimeline(
      summary([["BUF", [{ id: "p1", sec: 30 }, { id: "p2", sec: null }, { id: "p3", sec: 400 }]]])
    );
    expect(tl.plays.map((p) => p.visibleAtMs)).toEqual([
      T0 + 30_000,
      T0 + 30_000,
      T0 + 400_000,
    ]);
  });

  it("ignores a wallclock stamped a day off (ESPN did this to SF at LAR, 2026-09-10)", () => {
    const tl = buildNFLTimeline(
      summary([
        [
          "BUF",
          [
            { id: "p1", sec: 30 },
            { id: "to", sec: 30 + 86_400 },
            { id: "p2", sec: 120 },
            { id: "end", sec: 300, type: { text: "End of Game" } },
          ],
        ],
      ])
    );
    expect(tl.plays.map((p) => p.visibleAtMs)).toEqual([
      T0 + 30_000,
      T0 + 30_000,
      T0 + 120_000,
      T0 + 300_000,
    ]);
    expect(tl.ticks[tl.ticks.length - 1].fresh.status).toBe("final");
  });

  it("clamps a wallclock that runs backwards to the previous play", () => {
    const tl = buildNFLTimeline(
      summary([
        [
          "BUF",
          [
            { id: "p1", sec: 30 },
            { id: "p2", sec: 500 },
            { id: "end", sec: 100, type: { text: "End of Game" } },
          ],
        ],
      ])
    );
    expect(tl.plays[2].visibleAtMs).toBe(T0 + 500_000);
    expect(tl.ticks[tl.ticks.length - 1].atMs).toBeGreaterThanOrEqual(T0 + 500_000);
  });

  it("carries the running score and period of the last visible play", () => {
    const tl = buildNFLTimeline(
      summary(
        [
          [
            "BUF",
            [
              { id: "p1", sec: 30 },
              { id: "p3", sec: 150, scoringPlay: true, homeScore: 7 },
              { id: "p4", sec: 260, period: { number: 2 }, homeScore: 7 },
            ],
          ],
        ],
        [TD]
      )
    );
    const tickAt = (sec: number) =>
      tl.ticks.find((t) => t.atMs >= T0 + sec * 1000)!;
    expect(tickAt(150).fresh).toMatchObject({ period: 1, homeScore: 7, awayScore: 0 });
    expect(tickAt(260).fresh.period).toBe(2);
  });

  it("shows a scoring play from the first tick at or after it", () => {
    const tl = buildNFLTimeline(
      summary(
        [["BUF", [{ id: "p1", sec: 30 }, { id: "p3", sec: 150, scoringPlay: true, homeScore: 7 }]]],
        [TD]
      )
    );
    const before = tl.ticks.filter((t) => t.atMs < T0 + 150_000);
    const after = tl.ticks.filter((t) => t.atMs >= T0 + 150_000);
    expect(before.every((t) => t.scoringPlays.length === 0)).toBe(true);
    expect(after[0].scoringPlays).toEqual([TD]);
  });

  it("models drives.current as the drive of the last visible play", () => {
    const tl = buildNFLTimeline(
      summary([
        ["DET", [{ id: "a1", sec: 30 }, { id: "a2", sec: 70, isTurnover: true }]],
        ["BUF", [{ id: "b1", sec: 200 }]],
      ])
    );
    const mid = tl.ticks.find((t) => t.atMs >= T0 + 70_000 && t.atMs < T0 + 200_000)!;
    expect(mid.driveTeamCode).toBe("DET");
    expect(mid.drivePlays.map((p) => p.id)).toEqual(["a1", "a2"]);
    const late = tl.ticks.find((t) => t.atMs >= T0 + 200_000)!;
    expect(late.driveTeamCode).toBe("BUF");
    expect(late.drivePlays.map((p) => p.id)).toEqual(["b1"]);
  });

  it("ignores an end-of-quarter marker logged with time left (ESPN, ATL at PIT 2026-09-13)", () => {
    // ESPN's play log carried a stray "End Period" at 1:06 of Q2, 7.5
    // minutes before the real "End of Half". The scoreboard follows the
    // game clock, not that entry, so the period must not move on it.
    const tl = buildNFLTimeline(
      summary([
        [
          "BUF",
          [
            { id: "p1", sec: 30, period: { number: 2 } },
            { id: "stray", sec: 100, period: { number: 2 }, type: { text: "End Period" }, clock: { displayValue: "1:06" } },
            { id: "p2", sec: 300, period: { number: 2 } },
            { id: "half", sec: 600, period: { number: 2 }, type: { text: "End of Half" }, clock: { displayValue: "0:00" } },
          ],
        ],
      ])
    );
    const beforeHalf = tl.ticks.filter((t) => t.atMs >= T0 + 100_000 && t.atMs < T0 + 600_000);
    expect(beforeHalf.every((t) => t.fresh.period === 2 && !t.fresh.halftime)).toBe(true);
  });

  it("returns no ticks for a game with no plays", () => {
    expect(buildNFLTimeline(summary([])).ticks).toEqual([]);
  });

  describe("real game: DET at BUF, 2026-09-17", () => {
    const tl = buildNFLTimeline(fixture("nfl-summary-401872932-det-at-buf.json"));

    it("ends final 31-41 after 189 plays", () => {
      expect(tl.plays).toHaveLength(189);
      const last = tl.ticks[tl.ticks.length - 1];
      expect(last.fresh).toMatchObject({
        status: "final",
        awayCode: "DET",
        homeCode: "BUF",
        awayScore: 31,
        homeScore: 41,
      });
    });

    // Scoreboard behavior at breaks, as captured live on PHI at CHI
    // 2026-09-28: halftime holds period 2 with STATUS_HALFTIME until the
    // Q3 kickoff, and the end of Q1/Q3 flips straight to the next period.
    it("holds period 2 and flags halftime through the break until the Q3 kickoff", () => {
      const endHalf = tl.plays.find((p) => p.type?.text === "End of Half")!;
      const q3 = tl.plays.find((p) => p.period.number === 3)!;
      const during = tl.ticks.filter(
        (t) => t.atMs >= endHalf.visibleAtMs && t.atMs < q3.visibleAtMs
      );
      expect(during.length).toBeGreaterThan(10);
      expect(during.every((t) => t.fresh.period === 2 && t.fresh.halftime === true)).toBe(true);
      const after = tl.ticks.find((t) => t.atMs >= q3.visibleAtMs)!;
      expect(after.fresh.halftime).toBeFalsy();
    });

    it("flips to the next quarter at the end-of-quarter marker", () => {
      const endQ1 = tl.plays.find((p) => p.type?.text === "End Period" && p.period.number === 1)!;
      const firstQ2 = tl.plays.find((p) => p.period.number === 2)!;
      const between = tl.ticks.filter(
        (t) => t.atMs >= endQ1.visibleAtMs && t.atMs < firstQ2.visibleAtMs
      );
      expect(between.length).toBeGreaterThan(0);
      expect(between.every((t) => t.fresh.period === 2)).toBe(true);
    });
  });
});

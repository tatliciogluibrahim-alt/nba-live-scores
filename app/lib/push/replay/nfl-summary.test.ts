import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  trimNFLSummary,
  checkNFLSummaryContract,
  checkNFLScoreboardContract,
} from "./nfl-summary";

const FIXTURES = join(__dirname, "__fixtures__");
const load = (name: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));

// A raw ESPN-shaped summary carrying fields the replay never reads (odds,
// logos, participants) next to the ones it does.
function rawSummary() {
  return {
    header: {
      id: "g1",
      competitions: [
        {
          date: "2026-09-18T00:15Z",
          status: { type: { detail: "Final" } },
          competitors: [
            { homeAway: "home", score: "41", team: { abbreviation: "BUF", logos: [{}] } },
            { homeAway: "away", score: "31", team: { abbreviation: "DET", logos: [{}] } },
          ],
        },
      ],
    },
    odds: [{ spread: -3 }],
    drives: {
      previous: [
        {
          id: "d1",
          team: { abbreviation: "BUF", displayName: "Buffalo Bills" },
          plays: [
            {
              id: "p1",
              sequenceNumber: "100",
              wallclock: "2026-09-18T00:17:35Z",
              period: { number: 1 },
              clock: { value: 900, displayValue: "15:00" },
              type: { id: "53", text: "Kickoff" },
              text: "kick",
              scoringPlay: false,
              isTurnover: false,
              statYardage: 0,
              awayScore: 0,
              homeScore: 0,
              teamParticipants: [{ id: "x" }],
            },
          ],
        },
      ],
    },
    scoringPlays: [
      {
        id: "p1",
        type: { id: "68", text: "Rushing Touchdown", abbreviation: "TD" },
        scoringType: { name: "touchdown", displayName: "Touchdown" },
        text: "Josh Allen 1 Yd Rush (Tyler Bass Kick)",
        awayScore: 0,
        homeScore: 7,
        clock: { displayValue: "9:09" },
        team: { abbreviation: "BUF", logo: "x.png" },
      },
    ],
  };
}

describe("trimNFLSummary", () => {
  it("keeps the fields the replay reads and drops the rest", () => {
    const t = trimNFLSummary(rawSummary());
    expect(t.header.id).toBe("g1");
    expect(t.header.competitions[0].competitors).toEqual([
      { homeAway: "home", team: { abbreviation: "BUF" } },
      { homeAway: "away", team: { abbreviation: "DET" } },
    ]);
    expect(t.drives.previous[0]).toEqual({
      team: { abbreviation: "BUF" },
      plays: [
        {
          id: "p1",
          sequenceNumber: "100",
          wallclock: "2026-09-18T00:17:35Z",
          period: { number: 1 },
          clock: { displayValue: "15:00" },
          type: { text: "Kickoff" },
          text: "kick",
          scoringPlay: false,
          isTurnover: false,
          statYardage: 0,
          awayScore: 0,
          homeScore: 0,
        },
      ],
    });
    expect(t.scoringPlays[0]).toEqual({
      id: "p1",
      type: { abbreviation: "TD", text: "Rushing Touchdown" },
      scoringType: { name: "touchdown" },
      text: "Josh Allen 1 Yd Rush (Tyler Bass Kick)",
      awayScore: 0,
      homeScore: 7,
      team: { abbreviation: "BUF" },
    });
    expect("odds" in t).toBe(false);
  });

  it("keeps an in-progress game's current drive", () => {
    const raw = rawSummary();
    const withCurrent = {
      ...raw,
      drives: { ...raw.drives, current: raw.drives.previous[0] },
    };
    const t = trimNFLSummary(withCurrent);
    expect(t.drives.current?.team.abbreviation).toBe("BUF");
    expect(t.drives.current?.plays).toHaveLength(1);
  });
});

describe("checkNFLSummaryContract", () => {
  it("passes every committed real fixture", () => {
    for (const name of [
      "nfl-summary-401872932-det-at-buf.json",
      "nfl-summary-401872945-ind-at-kc-ot.json",
      "nfl-summary-401872933-car-at-atl.json",
      "nfl-summary-401872941-lv-at-lac.json",
    ]) {
      expect(checkNFLSummaryContract(load(name)).problems, name).toEqual([]);
    }
  });

  it("fails loud when ESPN moves the offense off the drive", () => {
    const raw = rawSummary();
    delete (raw.drives.previous[0] as { team?: unknown }).team;
    expect(checkNFLSummaryContract(raw).problems).toContain(
      "drives.previous[0].team.abbreviation missing"
    );
  });

  it("fails loud when a scoring play loses its team", () => {
    const raw = rawSummary();
    delete (raw.scoringPlays[0] as { team?: unknown }).team;
    expect(checkNFLSummaryContract(raw).problems).toContain(
      "scoringPlays[0] (p1) team.abbreviation missing"
    );
  });

  it("fails loud when a scoring play has no matching drive play", () => {
    const raw = rawSummary();
    raw.scoringPlays[0].id = "ghost";
    expect(checkNFLSummaryContract(raw).problems).toContain(
      "scoringPlays[0] (ghost) has no drive play"
    );
  });

  it("tolerates a missing wallclock as a warning, not a failure", () => {
    const raw = rawSummary();
    delete (raw.drives.previous[0].plays[0] as { wallclock?: string }).wallclock;
    const c = checkNFLSummaryContract(raw);
    expect(c.problems).toEqual([]);
    expect(c.warnings).toContain("1 play(s) without wallclock");
  });

  it("rejects a payload that is not a summary at all", () => {
    expect(checkNFLSummaryContract(null).problems).toContain("summary is not an object");
    expect(checkNFLSummaryContract({}).problems).toContain("header.id missing");
  });
});

// The scoreboard fields app/api/nfl-scores/normalize.ts and scan-nfl read.
function rawScoreboard() {
  return {
    events: [
      {
        id: "401872932",
        date: "2026-09-18T00:15Z",
        competitions: [
          {
            date: "2026-09-18T00:15Z",
            status: {
              period: 2,
              displayClock: "0:00",
              type: { state: "in", completed: false, name: "STATUS_HALFTIME", shortDetail: "Halftime" },
            },
            competitors: [
              { homeAway: "home", score: "27", team: { abbreviation: "BUF" } },
              { homeAway: "away", score: "7", team: { abbreviation: "DET" } },
            ],
          },
        ],
      },
    ],
  };
}

describe("checkNFLScoreboardContract", () => {
  it("passes a scoreboard with every field the pipeline reads", () => {
    expect(checkNFLScoreboardContract(rawScoreboard()).problems).toEqual([]);
  });

  it("fails loud when the status period disappears", () => {
    const sb = rawScoreboard();
    delete (sb.events[0].competitions[0].status as { period?: number }).period;
    expect(checkNFLScoreboardContract(sb).problems).toEqual([
      "event 401872932 status.period missing",
    ]);
  });

  it("fails loud when a competitor loses its score", () => {
    const sb = rawScoreboard();
    delete (sb.events[0].competitions[0].competitors[1] as { score?: string }).score;
    expect(checkNFLScoreboardContract(sb).problems).toEqual([
      "event 401872932 away score missing",
    ]);
  });

  it("fails loud when there is no events list at all", () => {
    expect(checkNFLScoreboardContract({}).problems).toEqual(["events missing"]);
  });
});

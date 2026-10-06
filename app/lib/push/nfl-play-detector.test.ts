import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  detectNFLPlays,
  type NFLScoringPlay,
  type NFLDrivePlay,
} from "./nfl-play-detector";

const fixture = JSON.parse(
  readFileSync(new URL("./__fixtures__/nfl-summary.json", import.meta.url), "utf8")
) as { scoringPlays: NFLScoringPlay[] };

const base = {
  gameId: "g1",
  awayCode: "MIN",
  homeCode: "CHI",
  awayScore: 27,
  homeScore: 24,
};

describe("detectNFLPlays — real scoring plays (CHI-MIN capture)", () => {
  it("classifies every real scoring play (rush/rec/def TD, FG)", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: fixture.scoringPlays,
      firedPlayIds: [],
    });
    const byType = events.reduce<Record<string, number>>((m, e) => {
      m[e.type] = (m[e.type] ?? 0) + 1;
      return m;
    }, {});
    // Real game had 5 TDs (2 rush, 2 rec, 1 def return) + 3 FGs... plus a 2pt.
    expect(byType["nfl-td-rushing"]).toBe(2); // Caleb Williams, J.J. McCarthy
    expect(byType["nfl-td-receiving"]).toBe(3); // Jefferson, Aaron Jones, Odunze (pass from)
    expect(byType["nfl-td-defensive"]).toBe(1); // Nahshon Wright INT return
    expect(byType["nfl-fg"]).toBe(3);
  });

  it("carries the player description as the note, minus the kick parenthetical", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: [fixture.scoringPlays[0]],
      firedPlayIds: [],
    });
    expect(events[0].note).toBe("Caleb Williams 9 Yd Rush");
    expect(events[0].type).toBe("nfl-td-rushing");
  });

  it("dedups on fired play ids (no re-push)", () => {
    const first = detectNFLPlays({
      ...base,
      scoringPlays: fixture.scoringPlays,
      firedPlayIds: [],
    });
    const second = detectNFLPlays({
      ...base,
      scoringPlays: fixture.scoringPlays,
      firedPlayIds: first.firedPlayIds,
    });
    expect(second.events).toHaveLength(0);
  });
});

describe("detectNFLPlays — big plays + turnovers (current drive)", () => {
  const drive = (over: Partial<NFLDrivePlay>): NFLDrivePlay => ({
    id: "p1",
    statYardage: 0,
    ...over,
  });

  it("fires a big rush ≥40yd (non-scoring)", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: [],
      drivePlays: [drive({ statYardage: 52, text: "J.Jacobs rush for 52 yards", type: { text: "Rush" } })],
      firedPlayIds: [],
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("nfl-big-play-rush");
  });

  it("fires a big reception ≥40yd and scores it higher when longer", () => {
    const short = detectNFLPlays({
      ...base,
      scoringPlays: [],
      drivePlays: [drive({ id: "a", statYardage: 41, type: { text: "Pass Reception" } })],
      firedPlayIds: [],
    }).events[0];
    const long = detectNFLPlays({
      ...base,
      scoringPlays: [],
      drivePlays: [drive({ id: "b", statYardage: 78, type: { text: "Pass Reception" } })],
      firedPlayIds: [],
    }).events[0];
    expect(short.type).toBe("nfl-big-play-rec");
    expect(long.significance!).toBeGreaterThan(short.significance!);
  });

  it("does NOT fire a big play under 40 yards", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: [],
      drivePlays: [drive({ statYardage: 39, type: { text: "Rush" } })],
      firedPlayIds: [],
    });
    expect(events).toHaveLength(0);
  });

  it("fires a turnover", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: [],
      drivePlays: [drive({ isTurnover: true, text: "J.Allen pass INTERCEPTED", type: { text: "Interception" } })],
      firedPlayIds: [],
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("nfl-turnover");
  });

  it("skips a scoring big play (already fired via scoringPlays)", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: [],
      drivePlays: [drive({ statYardage: 55, scoringPlay: true, type: { text: "Rush" } })],
      firedPlayIds: [],
    });
    expect(events).toHaveLength(0);
  });
});

describe("detectNFLPlays — team attribution (own-team Companion gate)", () => {
  it("carries the scoring team on every scoring-play event", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: fixture.scoringPlays,
      firedPlayIds: [],
    });
    expect(events.map((e) => e.teamCode)).toEqual(
      fixture.scoringPlays.map((p) => p.team?.abbreviation)
    );
    expect(events.every((e) => e.teamCode === "CHI" || e.teamCode === "MIN")).toBe(true);
  });

  it("carries the current drive's team on big plays and turnovers", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: [],
      driveTeamCode: "MIN",
      drivePlays: [
        { id: "d1", statYardage: 45, type: { text: "Rush" }, text: "A. Jones 45 yd run" },
        { id: "d2", isTurnover: true, text: "J. McCarthy INTERCEPTED" },
      ],
      firedPlayIds: [],
    });
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.teamCode)).toEqual(["MIN", "MIN"]);
  });

  it("leaves teamCode unset when the feed carries no team", () => {
    const { events } = detectNFLPlays({
      ...base,
      scoringPlays: [{ id: "s1", type: { abbreviation: "FG" }, text: "Kicker 40 Yd Field Goal" }],
      firedPlayIds: [],
    });
    expect(events[0].teamCode).toBeUndefined();
  });
});

describe("detectNFLPlays — big plays are scrimmage plays only (PIT at CLE, 2026 Week 4)", () => {
  const game = JSON.parse(
    readFileSync(
      new URL("./replay/__fixtures__/nfl-summary-401872964-pit-at-cle.json", import.meta.url),
      "utf8"
    )
  ) as {
    drives: { previous: { team?: { abbreviation?: string }; plays: NFLDrivePlay[] }[] };
  };

  function bigPlaysFor(drive: { team?: { abbreviation?: string }; plays: NFLDrivePlay[] }) {
    return detectNFLPlays({
      ...base,
      awayCode: "PIT",
      homeCode: "CLE",
      scoringPlays: [],
      driveTeamCode: drive.team?.abbreviation,
      drivePlays: drive.plays,
      firedPlayIds: [],
    }).events.filter((e) => e.type.startsWith("nfl-big-play"));
  }

  it("does not push a missed field goal as a big play", () => {
    const notes = game.drives.previous.flatMap((d) => bigPlaysFor(d).map((e) => e.note ?? ""));
    // Real game: C.Boswell's 48-yard miss carries statYardage 48 and went out
    // as "nfl-big-play-rush". Only the three 40+ yard catches are big plays.
    expect(notes.some((n) => /field goal/i.test(n))).toBe(false);
    expect(notes).toHaveLength(3);
    expect(notes.every((n) => / pass /.test(n))).toBe(true);
  });

  it("does not push kickoff or punt returns as big rushes", () => {
    const events = bigPlaysFor({
      team: { abbreviation: "PHI" },
      plays: [
        {
          id: "k1",
          statYardage: 55,
          type: { text: "Kickoff" },
          text: "C.Ryland kicks 65 yards from ARZ 35 to NYG 0. T.Tracy pushed ob at ARZ 45 for 55 yards (K.Clark).",
        },
        {
          id: "p1",
          statYardage: 41,
          type: { text: "Punt" },
          text: "E.Evans punts 51 yards to PHI 42, Center-J.Cardona. B.Covey pushed ob at LA 17 for 41 yards (O.Speights).",
        },
        { id: "r1", statYardage: 45, type: { text: "Rush" }, text: "S.Barkley right end to LA 20 for 45 yards." },
      ],
    });
    expect(events.map((e) => e.type)).toEqual(["nfl-big-play-rush"]);
  });
});

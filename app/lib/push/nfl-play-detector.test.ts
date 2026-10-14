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

describe("detectNFLPlays — missed field goals are not big plays (2026 Week 5)", () => {
  // NYG at WSH, 2026-10-11: D.Zvada missed from 50, 57 and 46. ESPN puts the
  // kick distance in statYardage, so each miss pushed "Big play" on Full
  // Details. A big play is a 40+ yard rush or reception (docs/nfl-design.md).
  const nygAtWsh = JSON.parse(
    readFileSync(
      new URL("./replay/__fixtures__/nfl-summary-401872988-nyg-at-wsh.json", import.meta.url),
      "utf8"
    )
  ) as { drives: { previous: { plays: NFLDrivePlay[] }[] } };
  const plays = nygAtWsh.drives.previous.flatMap((d) => d.plays);
  const misses = plays.filter((p) => p.type?.text === "Field Goal Missed");

  it("does not push a missed field goal as a big play", () => {
    expect(misses.map((p) => p.statYardage)).toEqual([50, 57, 46]);
    const { events } = detectNFLPlays({
      gameId: "401872988",
      awayCode: "NYG",
      homeCode: "WSH",
      awayScore: 0,
      homeScore: 0,
      scoringPlays: [],
      drivePlays: misses,
      firedPlayIds: [],
    });
    expect(events).toHaveLength(0);
  });
});

describe("detectNFLPlays — big plays are runs and catches, never nullified (2026 Weeks 4-5)", () => {
  // The Tuesday shift, 2026-10-13: kickoff and punt returns of 40+ yards
  // pushed "Big play" on Full Details (9 in Week 5 on a season follow), and
  // a 90-yard return wiped out by a penalty pushed anyway. The design
  // (docs/nfl-design.md) defines a big play as a 40+ yard rush or
  // reception. Play texts are ESPN's, verbatim.
  const input = (drivePlays: NFLDrivePlay[]) => ({
    gameId: "g1",
    awayCode: "ARZ",
    homeCode: "NYG",
    awayScore: 0,
    homeScore: 0,
    scoringPlays: [],
    drivePlays,
    firedPlayIds: [],
  });

  it("does not push a kickoff return as a big play", () => {
    const { events } = detectNFLPlays(
      input([
        {
          id: "kr",
          statYardage: 55,
          type: { text: "Kickoff" },
          text: "C.Ryland kicks 65 yards from ARZ 35 to NYG 0. T.Tracy pushed ob at ARZ 45 for 55 yards (K.Clark).",
        },
      ])
    );
    expect(events).toHaveLength(0);
  });

  it("does not push a punt return as a big play", () => {
    const { events } = detectNFLPlays(
      input([
        {
          id: "pr",
          statYardage: 41,
          type: { text: "Punt" },
          text: "E.Evans punts 51 yards to PHI 42, Center-J.Cardona. B.Covey pushed ob at LA 17 for 41 yards (O.Speights).",
        },
      ])
    );
    expect(events).toHaveLength(0);
  });

  it("never pushes a play nullified by penalty", () => {
    const { events } = detectNFLPlays(
      input([
        {
          // PHI at JAX, Week 5: the 90-yard return that never counted.
          id: "nullified-kr",
          statYardage: 90,
          type: { text: "Kickoff Return Touchdown" },
          text: "J.Elliott kicks 55 yards from PHI 35 to JAX 10. J.Cameron for 90 yards, TOUCHDOWN NULLIFIED by Penalty.Penalty on PHI-A.Epenesa, Illegal Formation, offsetting, enforced at PHI 35 - No Play.",
        },
        {
          // A field goal taken off the board reads as a 41-yard "Penalty".
          id: "nullified-fg",
          statYardage: 41,
          type: { text: "Penalty" },
          text: "M.Gay 41 yard field goal is GOOD, NULLIFIED by Penalty, Center-A.Ward, Holder-A.Cole.PENALTY on KC-P.Woods, Illegal Formation, 5 yards, enforced at KC 23 - No Play.",
        },
        {
          // Not seen yet, but a wiped-out turnover never happened either.
          id: "nullified-int",
          statYardage: 0,
          isTurnover: true,
          type: { text: "Interception" },
          text: "J.Allen pass deep left INTERCEPTED by T.Brown, NULLIFIED by Penalty.PENALTY on MIA, Defensive Holding, 5 yards - No Play.",
        },
      ])
    );
    expect(events).toHaveLength(0);
  });

  it("still pushes a 40+ yard run and catch", () => {
    const { events } = detectNFLPlays(
      input([
        {
          id: "rush",
          statYardage: 53,
          type: { text: "Rush" },
          text: "(Shotgun) O.Gordon left tackle pushed ob at MIN 11 for 53 yards (B.Murphy; H.Smith).",
        },
        {
          id: "rec",
          statYardage: 60,
          type: { text: "Pass Reception" },
          text: "(Shotgun) D.Watson pass deep left to D.Boston to PIT 14 for 60 yards (D.Everette).",
        },
      ])
    );
    expect(events.map((e) => e.type)).toEqual(["nfl-big-play-rush", "nfl-big-play-rec"]);
  });
});

describe("detectNFLPlays — a whole real game (PIT at CLE, 2026 Week 4)", () => {
  // From the Tuesday shift of 2026-10-06 (its branch was never merged, and
  // the rule it argued for landed 2026-10-13). Every drive of a real game:
  // only the three 40+ yard catches are big plays, and C.Boswell's 48-yard
  // miss, which carries statYardage 48, is not.
  const game = JSON.parse(
    readFileSync(
      new URL("./replay/__fixtures__/nfl-summary-401872964-pit-at-cle.json", import.meta.url),
      "utf8"
    )
  ) as {
    drives: { previous: { team?: { abbreviation?: string }; plays: NFLDrivePlay[] }[] };
  };

  it("pushes only the real runs and catches of 40+ yards", () => {
    const notes = game.drives.previous.flatMap((d) =>
      detectNFLPlays({
        ...base,
        awayCode: "PIT",
        homeCode: "CLE",
        scoringPlays: [],
        driveTeamCode: d.team?.abbreviation,
        drivePlays: d.plays,
        firedPlayIds: [],
      })
        .events.filter((e) => e.type.startsWith("nfl-big-play"))
        .map((e) => e.note ?? "")
    );
    expect(notes.some((n) => /field goal/i.test(n))).toBe(false);
    expect(notes).toHaveLength(3);
    expect(notes.every((n) => / pass /.test(n))).toBe(true);
  });
});

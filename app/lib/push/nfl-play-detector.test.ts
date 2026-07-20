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

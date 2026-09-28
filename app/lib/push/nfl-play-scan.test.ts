import { describe, it, expect } from "vitest";
import { scanNFLGamePlays } from "./nfl-play-scan";
import type { NFLScoringPlay, NFLDrivePlay } from "./nfl-play-detector";

// The per-game play scan scan-nfl runs on every live tick, extracted so the
// replay lab (app/lib/push/replay) drives the exact production code. These
// cases lock the behavior the route had before the extraction.

const TD: NFLScoringPlay = {
  id: "p1",
  type: { abbreviation: "TD", text: "Rushing Touchdown" },
  scoringType: { name: "touchdown" },
  text: "Josh Allen 1 Yd Rush (Tyler Bass Kick)",
  awayScore: 0,
  homeScore: 7,
  team: { abbreviation: "BUF" },
};

const FG: NFLScoringPlay = {
  id: "p2",
  type: { abbreviation: "FG", text: "Field Goal Good" },
  scoringType: { name: "field-goal" },
  text: "Jake Bates 44 Yd Field Goal",
  awayScore: 3,
  homeScore: 7,
  team: { abbreviation: "DET" },
};

const BIG_RUN: NFLDrivePlay = {
  id: "d1",
  statYardage: 52,
  isTurnover: false,
  scoringPlay: false,
  type: { text: "Rush" },
  text: "J.Gibbs left end for 52 yards",
};

const base = {
  gameId: "g1",
  awayCode: "DET",
  homeCode: "BUF",
  awayScore: 3,
  homeScore: 7,
  driveTeamCode: "DET",
};

describe("scanNFLGamePlays", () => {
  it("seeds silently when the fired set is empty and a scoring backlog exists", () => {
    const r = scanNFLGamePlays({
      ...base,
      scoringPlays: [TD, FG],
      drivePlays: [],
      firedPlayIds: [],
    });
    expect(r.kind).toBe("seeded");
    expect(r.events).toEqual([]);
    expect(r.firedPlayIds).toEqual(["p1", "p2"]);
  });

  it("fires a new scoring play once the fired set is warm", () => {
    const r = scanNFLGamePlays({
      ...base,
      scoringPlays: [TD, FG],
      drivePlays: [],
      firedPlayIds: ["p1"],
    });
    expect(r.kind).toBe("detected");
    expect(r.events.map((e) => e.type)).toEqual(["nfl-fg"]);
    expect(r.firedPlayIds).toEqual(["p1", "p2"]);
  });

  it("fires a big play with no scoring backlog even from an empty fired set", () => {
    const r = scanNFLGamePlays({
      ...base,
      scoringPlays: [],
      drivePlays: [BIG_RUN],
      firedPlayIds: [],
    });
    expect(r.kind).toBe("detected");
    expect(r.events.map((e) => e.type)).toEqual(["nfl-big-play-rush"]);
    expect(r.events[0].teamCode).toBe("DET");
  });
});

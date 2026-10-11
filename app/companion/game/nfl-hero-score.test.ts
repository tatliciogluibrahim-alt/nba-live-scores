import { describe, it, expect } from "vitest";
import { nflHeroScore, type HeroBoard, type HeroPlay } from "./nfl-hero-score";

// The hero must never trail the scoring list below it (persona sweep,
// 2026-10-11: 0–7 over a list reading 0–13 for about 20s). The two feeds
// poll separately: the scoreboard through a 30s server cache, the summary
// fresh. The hero takes whichever is newer in game time.
//
// Values are real, from IND at PIT, Week 5 (2026-10-11 captures):
//   14:57:46 scoreboard  IND 16 PIT 17, Q3 7:16
//   14:58:02 scoreboard  IND 16 PIT 23, Q3 7:06 (TD, kick pending)
//   14:58:27 summary     Jaylen Warren 50 Yd Rush, Q3 7:06, 16–23
//   14:58:32 scoreboard  IND 16 PIT 24 (the kick)
//   14:58:59 summary     the same play, now 16–24

const FG: HeroPlay = { period: 3, clock: "10:23", awayScore: 16, homeScore: 17 };
const TD: HeroPlay = { period: 3, clock: "7:06", awayScore: 16, homeScore: 23 };
const TD_KICK: HeroPlay = { ...TD, homeScore: 24 };

function board(over: Partial<HeroBoard> = {}): HeroBoard {
  return { status: "live", period: 3, clock: "7:16", away: 16, home: 17, ...over };
}

describe("nflHeroScore", () => {
  it("a scoring play newer than the cached scoreboard wins", () => {
    expect(nflHeroScore(board(), [FG, TD])).toEqual({ away: 16, home: 23, from: "scoring" });
  });

  it("a scoreboard newer than the scoring list wins", () => {
    // The scoreboard moved on (Q3 6:40) while the summary still ends at the FG.
    expect(nflHeroScore(board({ clock: "6:40", away: 16, home: 17 }), [FG])).toEqual({
      away: 16,
      home: 17,
      from: "scoreboard",
    });
  });

  it("at the same moment, the higher score is the newer one", () => {
    // Scoreboard has the kick, the summary does not yet.
    expect(nflHeroScore(board({ clock: "7:06", home: 24 }), [FG, TD])).toEqual({
      away: 16,
      home: 24,
      from: "scoreboard",
    });
    // Summary has the kick, the scoreboard does not yet.
    expect(nflHeroScore(board({ clock: "7:06", home: 23 }), [FG, TD_KICK])).toEqual({
      away: 16,
      home: 24,
      from: "scoring",
    });
  });

  it("a later scoreboard wins even with a lower score (a score taken off on review)", () => {
    expect(nflHeroScore(board({ clock: "6:50", home: 17 }), [FG, TD])).toEqual({
      away: 16,
      home: 17,
      from: "scoreboard",
    });
  });

  it("a break sits at the end of the quarter it closes", () => {
    // The flip: period 4 at 15:00 is the end of the 3rd, later than any Q3 play.
    const flip = board({ period: 4, clock: "15:00", away: 16, home: 24 });
    expect(nflHeroScore(flip, [FG, TD_KICK]).from).toBe("scoreboard");
    // Halftime (period 2, 0:00) against a field goal on the last play of the half.
    const half = board({ period: 2, clock: "0:00", away: 10, home: 14 });
    const lastSecondFG: HeroPlay = { period: 2, clock: "0:00", awayScore: 10, homeScore: 17 };
    expect(nflHeroScore(half, [lastSecondFG])).toEqual({ away: 10, home: 17, from: "scoring" });
  });

  it("the latest play is the newest in game time, not the last in the array", () => {
    expect(nflHeroScore(board({ clock: "9:00" }), [TD, FG])).toEqual({
      away: 16,
      home: 23,
      from: "scoring",
    });
  });

  it("finals and upcoming games keep the scoreboard", () => {
    expect(nflHeroScore(board({ status: "final", away: 16, home: 31 }), [FG, TD]).from).toBe(
      "scoreboard"
    );
    expect(nflHeroScore(board({ status: "upcoming", away: 0, home: 0 }), [TD]).from).toBe(
      "scoreboard"
    );
  });

  it("no plays, or a scoreboard with no clock, falls back safely", () => {
    expect(nflHeroScore(board(), [])).toEqual({ away: 16, home: 17, from: "scoreboard" });
    // No clock on the scoreboard: the higher total stands in for newer.
    expect(nflHeroScore(board({ clock: undefined }), [FG, TD])).toEqual({
      away: 16,
      home: 23,
      from: "scoring",
    });
  });
});

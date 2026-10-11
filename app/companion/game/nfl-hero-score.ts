// The NFL game page hero's score (persona sweep, 2026-10-11). The hero and
// the SCORING list below it read two feeds: the scoreboard (through a 30s
// server cache, polled every 10s) and the ESPN summary (fresh, every 15s).
// Right after a touchdown the list ran ahead and the hero trailed it, 0–7
// over a play reading 0–13. The hero now takes whichever is newer in game
// time: the scoreboard's period + clock against the latest scoring play's.
// At the same moment (a stopped clock after a score) the higher total is
// the newer one, since a kick lands a beat after its touchdown. A later
// scoreboard wins even with a lower score, so a score taken off on review
// does not stick.
//
// Pure. No-Spoilers is not decided here: the numbers feed the Monument,
// whose Spoiler renders placeholder glyphs for a hidden game, so the
// digits never reach the DOM either way.

export type HeroBoard = {
  status: "live" | "upcoming" | "final";
  /** Scoreboard period (1-4, 5+ OT). */
  period: number;
  /** Scoreboard clock ("7:16"). ESPN holds "15:00" through the flip after
   *  Q1 and Q3 and "0:00" at halftime, which places a break at the end of
   *  the quarter it closes. */
  clock?: string;
  away: number;
  home: number;
};

export type HeroPlay = {
  period: number;
  /** Clock at the score ("7:06"). */
  clock: string;
  /** Running score after the play. */
  awayScore: number;
  homeScore: number;
};

export type HeroScore = {
  away: number;
  home: number;
  from: "scoreboard" | "scoring";
};

// One quarter, in seconds. Overtime runs shorter, but only the order
// matters: a later period always sits after an earlier one.
const QUARTER_S = 15 * 60;

function clockSeconds(clock: string | undefined): number | null {
  const m = clock?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Seconds of game played at (period, clock), or null when unknown. */
function gameTime(period: number, clock: string | undefined): number | null {
  const left = clockSeconds(clock);
  if (left == null || !Number.isFinite(period) || period < 1) return null;
  return (period - 1) * QUARTER_S + (QUARTER_S - Math.min(QUARTER_S, left));
}

export function nflHeroScore(
  board: HeroBoard,
  plays: readonly HeroPlay[]
): HeroScore {
  const fromBoard: HeroScore = { away: board.away, home: board.home, from: "scoreboard" };
  // Final is the last word, and an upcoming game has no score to race.
  if (board.status !== "live" || plays.length === 0) return fromBoard;

  // The newest scoring play by game time (a later entry wins a tie).
  let latest = plays[plays.length - 1];
  let latestT = gameTime(latest.period, latest.clock);
  for (const p of plays) {
    const t = gameTime(p.period, p.clock);
    if (t != null && (latestT == null || t >= latestT)) {
      latest = p;
      latestT = t;
    }
  }

  const boardT = gameTime(board.period, board.clock);
  const scoringIsNewer =
    boardT != null && latestT != null && boardT !== latestT
      ? latestT > boardT
      : latest.awayScore + latest.homeScore > board.away + board.home;

  return scoringIsNewer
    ? { away: latest.awayScore, home: latest.homeScore, from: "scoring" }
    : fromBoard;
}

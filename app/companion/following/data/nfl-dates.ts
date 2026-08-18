// NFL season dates — one source of truth for the copy that points past the
// World Cup dead zone toward the next moment on the calendar.
//
// The 2026 season opener is confirmed (schedule released): the NFL Kickoff
// Game is Wednesday, September 9, 2026, with the reigning Super Bowl LX
// champion Seattle hosting New England. Real, published date — no fabrication.
export const NFL_2026_SEASON_OPENER = {
  iso: "2026-09-09",
  /** Pre-formatted for copy so the date lives in exactly one place. */
  label: "September 9",
} as const;

// The NFL "season year" is the calendar year the season STARTS (the 2026
// season runs Sep 2026 through its Feb 2027 Super Bowl — still year 2026 to
// ESPN). The scoreboard feed needs this to disambiguate a paged week query:
// `?week=3&seasontype=2` with no year returns the LAST COMPLETED season
// (2025, all finals), so paging past the current week would show last
// year's scores. Derived from the opener so it moves with the season data.
export const NFL_SEASON_YEAR = Number(NFL_2026_SEASON_OPENER.iso.slice(0, 4));

// The 2026 season ends at Super Bowl LXI — Feb 14, 2027, SoFi Stadium
// (confirmed alongside the schedule release). The tournament-phase
// concluded boundary reads this so a stored `nfl-season-2026` follow
// stops reading "active" the day after the title game.
export const NFL_2026_SEASON_END = {
  iso: "2027-02-14",
  label: "February 14",
} as const;

// ── Season shape + week naming ────────────────────────────────────────
// ESPN season types: 1 preseason · 2 regular · 3 postseason. Week naming
// differs per type, and three surfaces need it (Schedule pager, game
// detail, Today). One home so a preseason week is never labelled "Week 2
// of 18" and a playoff week is never a bare number.

/** Week ceiling per season type. The pager must never assume "of 18". */
export function nflSeasonBounds(seasonType: number): { min: number; max: number } {
  if (seasonType === 1) return { min: 1, max: 4 }; // HOF week through preseason 3
  if (seasonType === 3) return { min: 1, max: 5 }; // Wild Card through Super Bowl
  return { min: 1, max: 18 }; // regular season
}

/** Postseason weeks have names, not numbers. Week 4 (the old Pro Bowl
 *  slot) is skipped in the modern schedule, so it falls through. */
export function nflPostseasonLabel(week: number): string {
  const names: Record<number, string> = {
    1: "Wild Card",
    2: "Divisional",
    3: "Conf. Championship",
    5: "Super Bowl",
  };
  return names[week] ?? `Playoffs · Wk ${week}`;
}

/** Compact context label — the kicker tail on a game row or hero.
 *  "Preseason · Wk 2" · "Wild Card" · "Week 5" */
export function nflWeekLabel(seasonType: number, week: number): string {
  if (seasonType === 1) return `Preseason · Wk ${week}`;
  if (seasonType === 3) return nflPostseasonLabel(week);
  return `Week ${week}`;
}

/** Pager label — carries the regular season's "of 18" denominator so
 *  paging reads as progress through a known season. */
export function nflPagerLabel(seasonType: number, week: number): string {
  if (seasonType === 2) return `Week ${week} of ${nflSeasonBounds(2).max}`;
  return nflWeekLabel(seasonType, week);
}

/** Section-header register ("Preseason Week 2"), no middot. */
export function nflWeekHeader(seasonType: number, week: number): string {
  if (seasonType === 1) return `Preseason Week ${week}`;
  if (seasonType === 3) return nflPostseasonLabel(week);
  return `Week ${week}`;
}

/** The week AFTER (seasonType, week), rolling into the next season type at
 *  the boundary. Null past the Super Bowl.
 *
 *  Today needs this because ESPN's bare scoreboard serves the CURRENT week
 *  and does not roll to the next one until well after the last game ends —
 *  so on a Tuesday every game reads final and a followed team looks like it
 *  has nothing coming, when it kicks off Thursday. */
export function nextNFLWeek(
  seasonType: number,
  week: number
): { seasonType: number; week: number } | null {
  const { max } = nflSeasonBounds(seasonType);
  if (week < max) return { seasonType, week: week + 1 };
  if (seasonType === 1) return { seasonType: 2, week: 1 };
  if (seasonType === 2) return { seasonType: 3, week: 1 };
  return null; // season over
}

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

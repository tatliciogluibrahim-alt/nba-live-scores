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

// The 2026 season ends at Super Bowl LXI — Feb 14, 2027, SoFi Stadium
// (confirmed alongside the schedule release). The tournament-phase
// concluded boundary reads this so a stored `nfl-season-2026` follow
// stops reading "active" the day after the title game.
export const NFL_2026_SEASON_END = {
  iso: "2027-02-14",
  label: "February 14",
} as const;

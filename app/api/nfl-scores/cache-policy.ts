// How long a cached NFL scoreboard counts as fresh. Updates reached the app a
// median 46s after the play with a flat 30s window (persona sweep,
// 2026-10-11). While a game is live the scoreboard is fresh for 10s. Idle
// stays at 30s: scan-nfl reads this route, and its kickoff detection was
// tuned against that window.

export const LIVE_TTL_SECONDS = 10;
export const IDLE_TTL_SECONDS = 30;
/** KV keeps the last payload this long so an ESPN outage can serve it. */
export const KV_KEEP_SECONDS = 300;

export function freshForSeconds(payload: { games: { status: string }[] }): number {
  return payload.games.some((g) => g.status === "live") ? LIVE_TTL_SECONDS : IDLE_TTL_SECONDS;
}

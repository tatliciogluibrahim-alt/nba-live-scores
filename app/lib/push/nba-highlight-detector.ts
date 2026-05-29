// NBA player-milestone highlight detector.
//
// The scoreboard scan only knows team scores, so highlights ("SGA hit
// 30 PTS") need the per-game ESPN summary (leaders). For each live game
// the scan fetches /api/nba-game-detail, hands the scoring leaders here,
// and we emit a push when a player *crosses* a points milestone we
// haven't already fired for this game. Fired milestones persist per
// game so we never double-ping the same threshold.
//
// Conservative by design: we only fire on a confidently-parsed integer
// points value, and only for the scoring ("PTS") leaders. Assists /
// rebounds milestones can come later; points is the universally-legible
// one and avoids noisy thresholds.

import type { PushEvent } from "./event-detector";

// Points thresholds that earn a ping, ascending. A 41-point game fires
// once at 30 and once at 40 (not at 31..39).
const POINT_MILESTONES = [30, 40, 50, 60] as const;

export type HighlightLeader = {
  /** Stat label, e.g. "PTS". */
  label: string;
  /** Player short name, e.g. "SGA". */
  name: string;
  /** Team abbreviation. */
  team: string;
  /** Raw value string from the leaders feed ("30") and/or a fuller
   *  statline in `detail` ("30 PTS, 6 AST"). */
  value: string;
  detail?: string;
};

export type HighlightInput = {
  gameId: string;
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  leaders: HighlightLeader[];
  /** Milestone keys already fired for this game ("SGA:30"). */
  firedKeys: string[];
};

export type HighlightResult = {
  events: PushEvent[];
  /** The full fired-key set to persist (old ∪ newly fired). */
  firedKeys: string[];
};

/** Pull an integer point total from a PTS leader. Prefers a clean
 *  numeric `value`, falls back to "(\d+) PTS" in the statline. Returns
 *  null when nothing parses confidently. */
function parsePoints(leader: HighlightLeader): number | null {
  if (!/pts|point/i.test(leader.label)) {
    // Only the scoring leader counts. Some feeds label it "PTS".
    if (!/pts|point/i.test(leader.detail ?? "")) return null;
  }
  const direct = Number(String(leader.value).trim());
  if (Number.isInteger(direct) && direct >= 0 && direct < 120) return direct;
  const m = (leader.detail ?? "").match(/(\d{1,3})\s*PTS/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isInteger(n) && n < 120) return n;
  }
  return null;
}

/** Highest milestone at or below `pts` (e.g. 41 → 40). Null below 30. */
function milestoneFor(pts: number): number | null {
  let hit: number | null = null;
  for (const m of POINT_MILESTONES) {
    if (pts >= m) hit = m;
  }
  return hit;
}

export function detectNBAHighlights(input: HighlightInput): HighlightResult {
  const fired = new Set(input.firedKeys);
  const events: PushEvent[] = [];

  for (const leader of input.leaders) {
    const pts = parsePoints(leader);
    if (pts == null) continue;
    const milestone = milestoneFor(pts);
    if (milestone == null) continue;

    const key = `${leader.name}:${milestone}`;
    if (fired.has(key)) continue;
    fired.add(key);

    events.push({
      type: "nba-highlight",
      gameId: input.gameId,
      awayCode: input.awayCode,
      homeCode: input.homeCode,
      awayScore: input.awayScore,
      homeScore: input.homeScore,
      // Render the real number the player has now, not just the
      // threshold — "SGA · 34 PTS" reads truer than "SGA · 30 PTS".
      note: `${leader.name} · ${pts} PTS${leader.team ? ` (${leader.team})` : ""}`,
    });
  }

  return { events, firedKeys: Array.from(fired) };
}

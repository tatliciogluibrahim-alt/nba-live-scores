// Soccer scorer + minute helpers for the WC push pipeline.
//
// CRITICAL: the WC feed serializes an event's minute as a STRING ("9'",
// "75'", "90'+2'") — not a number. Comparing those strings directly is a
// lexicographic compare, so "9'" >= "75'" is TRUE and the "latest goal"
// reduce picks the wrong scorer in any match with 2+ goals. Always parse the
// minute to a number before comparing. (This module exists so that rule is
// tested in isolation, away from the cron route's heavy imports.)

export type ScorerEvent = {
  /** ESPN soccer clock string, e.g. "9'", "45+2", "90'+2'". May be null. */
  minute: string | null;
  type: "goal" | "pen_goal" | "own_goal" | "red_card" | "yellow_card";
  playerName?: string;
};

// Parse the leading minute from an ESPN soccer clock string ("45+2", "63'").
// Folds stoppage time ("90'+2'" → 92). Null for halftime / full-time / pre.
export function parseMinute(statusText: string | undefined | null): number | null {
  if (!statusText) return null;
  // Allow an optional prime between the minute and the stoppage so both
  // "90+2" and "90'+2'" fold to 92 (the original regex dropped the +2 when a
  // prime preceded it).
  const m = statusText.match(/(\d{1,3})'?(?:\+(\d{1,2}))?/);
  if (!m) return null;
  const base = Number(m[1]);
  const stoppage = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(base)) return null;
  return base + stoppage;
}

// Latest goal scorer for the push body — the goal with the highest minute
// (the one that just moved the scoreline when the detector fires wc-goal).
// Own goals are tagged "(OG)" so the push reads honestly. Null when no goal
// carried a name. Minutes are parsed numerically (see the module note).
export function latestScorer(events: ScorerEvent[] | undefined): string | null {
  if (!events || events.length === 0) return null;
  const goals = events.filter(
    (e) =>
      (e.type === "goal" || e.type === "pen_goal" || e.type === "own_goal") &&
      !!e.playerName
  );
  if (goals.length === 0) return null;
  const latest = goals.reduce((best, e) =>
    (parseMinute(e.minute) ?? -1) >= (parseMinute(best.minute) ?? -1) ? e : best
  );
  const name = latest.playerName as string;
  return latest.type === "own_goal" ? `${name} (OG)` : name;
}

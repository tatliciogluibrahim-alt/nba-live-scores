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

// The named goal with the highest minute (the most recent). Minutes are parsed
// numerically (see the module note). Null when no goal carried a name.
function latestGoalEvent(events: ScorerEvent[] | undefined): ScorerEvent | null {
  if (!events || events.length === 0) return null;
  const goals = events.filter(
    (e) =>
      (e.type === "goal" || e.type === "pen_goal" || e.type === "own_goal") &&
      !!e.playerName
  );
  if (goals.length === 0) return null;
  return goals.reduce((best, e) =>
    (parseMinute(e.minute) ?? -1) >= (parseMinute(best.minute) ?? -1) ? e : best
  );
}

function format(goal: ScorerEvent): string {
  const name = goal.playerName as string;
  return goal.type === "own_goal" ? `${name} (OG)` : name;
}

// Latest goal scorer for the push body — the goal that just moved the
// scoreline when the detector fires wc-goal. Own goals are tagged "(OG)".
export function latestScorer(events: ScorerEvent[] | undefined): string | null {
  const goal = latestGoalEvent(events);
  return goal ? format(goal) : null;
}

// Scorer for the push body, but ONLY when we're confident it's the goal that
// just scored. When the scoreboard total rose but the matching goal event
// hasn't landed in the feed yet, the "latest" named goal is a stale earlier
// one — naming it would be a confident lie. So if the match minute is known
// and the latest named goal is more than `windowMin` behind it, return null
// and let the push send a plain "Goal" line (data-integrity: omit over wrong).
export function recentScorer(
  events: ScorerEvent[] | undefined,
  matchMinute: number | null,
  windowMin = 6
): string | null {
  const goal = latestGoalEvent(events);
  if (!goal) return null;
  if (matchMinute != null) {
    const goalMinute = parseMinute(goal.minute);
    if (goalMinute == null || matchMinute - goalMinute > windowMin) return null;
  }
  return format(goal);
}

// Compose the personalized brief content for a single subscriber.
// Pure function — takes the subscriber + the day's game data, returns
// a structured BriefPayload that both the HTML email composer and
// the in-app preview page render from the same shape.
//
// Sections:
//   1. Yesterday — finals from the user's followed teams/countries
//   2. Today — scheduled games/matches that match follows
//   3. Worth knowing — stake context for impending games (Game 7s, etc)
//   4. Your alerts — calm summary of follow + alert tier state
//
// Cross-sport: NBA today, WC slots in once /api/world-cup returns
// fixtures. NFL ships when Phase 12 lands. Each follow kind has a
// match predicate so the same composer handles team / country /
// series / tournament inputs.

import type { Follow } from "../../companion/state/types";
import type { BriefSubscriber } from "./subscriber-store";
import { deriveNBARecap } from "../../companion/recap/derive-recap";
import type { Game } from "../../nba/types";

export type BriefGameRow = {
  source: "nba" | "wc";
  matchup: string;          // "NYK · CLE"
  scoreLine: string | null; // "121 – 98" (final) or null (upcoming)
  status: "live" | "upcoming" | "final";
  /** Calm one-line context, e.g. "Game 4 · Conference Finals" /
   *  "Tonight · 8:30 PM" / "Final · NYK wins series 4-0". */
  context: string;
  /** Optional recap blurb — 1-2 sentences for finals when the brief
   *  has room. Built from the recap deriver's top performer + story. */
  recapBlurbs?: string[];
  /** Deep-link path back to the app's game detail. Tokenized? No —
   *  game IDs are public; auth isn't needed. */
  href: string;
};

export type BriefPayload = {
  /** Display date in the brief header, e.g. "Tuesday · May 27". */
  dateLabel: string;
  /** Yesterday's finals matching the user's follows. */
  yesterday: BriefGameRow[];
  /** Today's scheduled (or live) games matching the user's follows. */
  today: BriefGameRow[];
  /** Stake context lines for impending games — "Knicks can clinch
   *  tonight" etc. Drawn from the stakes deriver. */
  worthKnowing: string[];
  /** Calm summary of the subscriber's follow + alert state. */
  alerts: {
    summary: string; // "2 teams · 1 country"
    enabled: number; // # of follows with alertEnabled
    tiers: string[]; // ["Türkiye · Companion", "NBA Playoffs · All"]
  };
};

// ── Match predicates per follow kind ─────────────────────────────────

function gameIncludes(game: Game, code: string): boolean {
  return (
    game.away.abbreviation === code || game.home.abbreviation === code
  );
}

function nbaGameMatchesFollow(game: Game, follow: Follow): boolean {
  switch (follow.kind) {
    case "team":
      return gameIncludes(game, follow.id);
    case "series": {
      const [a, b] = follow.id.split("-");
      if (!a || !b) return false;
      return gameIncludes(game, a) && gameIncludes(game, b);
    }
    case "tournament":
      return follow.id.startsWith("nba-playoffs-");
    case "country":
      return false; // country follows don't drive NBA games
  }
}

// ── Format helpers ───────────────────────────────────────────────────

function formatGameTime(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function todayHeader(now = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function isYesterday(dateStr: string, now = new Date()): boolean {
  const d = new Date(dateStr);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

function isToday(dateStr: string, now = new Date()): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function summarizeFollowKinds(follows: Follow[]): string {
  const counts = { team: 0, country: 0, series: 0, tournament: 0 };
  for (const f of follows) counts[f.kind]++;
  const parts: string[] = [];
  if (counts.team)
    parts.push(`${counts.team} ${counts.team === 1 ? "team" : "teams"}`);
  if (counts.country)
    parts.push(
      `${counts.country} ${counts.country === 1 ? "country" : "countries"}`
    );
  if (counts.series) parts.push(`${counts.series} series`);
  if (counts.tournament)
    parts.push(
      `${counts.tournament} ${
        counts.tournament === 1 ? "tournament" : "tournaments"
      }`
    );
  return parts.join(" · ");
}

// ── Public composer ─────────────────────────────────────────────────

export function composeBrief({
  subscriber,
  nba,
  now = new Date(),
}: {
  subscriber: BriefSubscriber;
  /** NBA game list — should be the seriesGames window (~14d) so
   *  yesterday's finals are included even at week-boundary days. */
  nba: Game[];
  /** Optional fixed clock for testing / preview. */
  now?: Date;
}): BriefPayload {
  const follows = subscriber.follows ?? [];

  // Yesterday: finals matching any follow.
  const yesterdayFinals = nba.filter(
    (g) =>
      g.status === "final" &&
      isYesterday(g.date, now) &&
      follows.some((f) => nbaGameMatchesFollow(g, f))
  );

  const yesterday: BriefGameRow[] = yesterdayFinals
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((g) => {
      const recap = deriveNBARecap(g);
      // Build 1-2 recap blurbs from the recap shape. Top bullet +
      // optional story bullet. Keep it tight — the brief reads like
      // a newsletter, not a feed.
      const blurbs = subscriber.includeScores
        ? recap?.bullets.slice(0, 2).map((b) => b.body) ?? []
        : [];

      const score = subscriber.includeScores
        ? `${g.away.score} – ${g.home.score}`
        : null;

      const context = g.seriesSummary
        ? subscriber.includeScores
          ? g.seriesSummary
          : "Series state hidden."
        : "Final.";

      return {
        source: "nba",
        matchup: `${g.away.abbreviation} · ${g.home.abbreviation}`,
        scoreLine: score,
        status: g.status,
        context,
        recapBlurbs: blurbs,
        href: `/game/${g.id}`,
      };
    });

  // Today: upcoming/live games matching any follow.
  const todayGames = nba.filter(
    (g) =>
      (g.status === "upcoming" || g.status === "live") &&
      isToday(g.date, now) &&
      follows.some((f) => nbaGameMatchesFollow(g, f))
  );

  const today: BriefGameRow[] = todayGames
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((g) => {
      const context = `${formatGameTime(g.date)}${
        g.gameContext ? ` · ${g.gameContext}` : ""
      }`;
      return {
        source: "nba",
        matchup: `${g.away.abbreviation} · ${g.home.abbreviation}`,
        scoreLine: null,
        status: g.status,
        context,
        href: `/game/${g.id}`,
      };
    });

  // Worth knowing: stake context for today's games. We re-use the
  // stake derivation to surface "X can close the series tonight" etc.
  // Pulled inline rather than imported to avoid cross-app coupling.
  const worthKnowing: string[] = [];
  for (const g of todayGames) {
    const summary = g.seriesSummary ?? "";
    if (!subscriber.includeScores) continue; // stake reveals state
    if (/3\s*-\s*0/.test(summary)) {
      const lead = summary.match(/(\w+)/);
      if (lead) worthKnowing.push(`${lead[1]} can sweep with a win tonight.`);
    } else if (/3\s*-\s*1/.test(summary)) {
      const lead = summary.match(/(\w+)/);
      if (lead) worthKnowing.push(`${lead[1]} can close the series tonight.`);
    } else if (/3\s*-\s*2/.test(summary)) {
      worthKnowing.push("Elimination game for one side.");
    } else if (/TIED\s+3\s*-\s*3/i.test(summary)) {
      worthKnowing.push("Game 7. Winner takes the series.");
    }
  }

  // Alerts summary.
  const enabledFollows = follows.filter((f) => f.alertEnabled);
  const tiers = enabledFollows.slice(0, 5).map((f) => {
    const label =
      f.alertTier === "all"
        ? "All moments"
        : f.alertTier === "companion"
          ? "Companion"
          : "Quiet";
    return `${f.id} · ${label}`;
  });

  return {
    dateLabel: todayHeader(now),
    yesterday,
    today,
    worthKnowing,
    alerts: {
      summary: summarizeFollowKinds(follows),
      enabled: enabledFollows.length,
      tiers,
    },
  };
}

/** Is this brief empty enough to skip sending? An empty brief
 *  (no yesterday finals, no today games) is just noise. */
export function shouldSendBrief(payload: BriefPayload): boolean {
  return (
    payload.yesterday.length > 0 ||
    payload.today.length > 0 ||
    payload.worthKnowing.length > 0
  );
}

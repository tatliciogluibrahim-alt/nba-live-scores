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
import { getTeam } from "../../companion/following/data/teams";
import {
  countryDisplayName,
  getCountry,
  WC_COUNTRIES,
} from "../../companion/following/data/countries";
import { getTournament } from "../../companion/following/data/tournaments";
import type { Game } from "../../nba/types";

// First whistle of the World Cup. Defined locally so the composer stays
// free of the big today-data module. Keep in sync with WC_KICKOFF there.
const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

/** "A, B, and C" — Oxford comma list for the countdown group-mates. */
function listWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Human-readable label for a follow, for the "Your alerts" lines. The
// raw follow id ("OKC", "USA", "OKC-SA", "nba-playoffs-2025") is a
// storage key, not something to show a subscriber. Resolves against the
// static directories (all pure data — safe in the cron). Falls back to
// the raw id if a lookup misses so a new/unknown id never blanks out.
function followLabel(follow: Follow): string {
  switch (follow.kind) {
    case "team":
      return getTeam(follow.id)?.name ?? follow.id;
    case "country":
      return countryDisplayName(follow.id);
    case "series": {
      const [a, b] = follow.id.split("-");
      const an = a ? getTeam(a)?.name ?? a : a;
      const bn = b ? getTeam(b)?.name ?? b : b;
      return a && b ? `${an} vs ${bn}` : follow.id;
    }
    case "tournament":
      return getTournament(follow.id)?.name ?? follow.id;
  }
}

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
  /** Long weekday for the masthead gutter, e.g. "Thursday". */
  weekday: string;
  /** Short month + day for the big masthead headline, e.g. "May 28". */
  monthDay: string;
  /** Short month + day for yesterday's section sublabel, e.g. "May 27". */
  yesterdayMonthDay: string;
  /** Sequential issue number for the masthead ("Your Brief · 142"). */
  issueNumber: number;
  /** Yesterday's finals matching the user's follows. */
  yesterday: BriefGameRow[];
  /** Today's scheduled (or live) games matching the user's follows. */
  today: BriefGameRow[];
  /** Stake context lines for impending games — "Knicks can clinch
   *  tonight" etc. Drawn from the stakes deriver. */
  worthKnowing: string[];
  /** Optional anticipatory countdown for "Worth knowing" — the World Cup
   *  run-up. Renders as a big accent numeral + label + sentence. Only set
   *  pre-kickoff for subscribers who follow a country or the tournament;
   *  never the sole reason a brief sends. */
  countdown?: {
    number: number;
    accentLabel: string; // "Days · World Cup"
    text: string;
  };
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
  return now.toLocaleDateString("en-US", {
    timeZone: SPORTS_TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// Day windowing runs on the US Eastern "sports day", not UTC. NBA evening
// games tip after midnight UTC (e.g. 8:30pm ET = 00:30 UTC next day), so
// a UTC date comparison drops tonight's game from "Today" and last
// night's from "Yesterday". Comparing the ET calendar date fixes it.
const SPORTS_TZ = "America/New_York";

/** ET calendar date as a sortable/comparable "YYYY-MM-DD" key. */
function etDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: SPORTS_TZ });
}

function isYesterday(dateStr: string, now = new Date()): boolean {
  const y = new Date(now.getTime() - 86_400_000);
  return etDateKey(new Date(dateStr)) === etDateKey(y);
}

function isToday(dateStr: string, now = new Date()): boolean {
  return etDateKey(new Date(dateStr)) === etDateKey(now);
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
    // Use the LEADS/WINS pattern to capture the leading team's code
    // explicitly rather than grabbing the first word — the loose
    // `(\w+)` would say "SERIES can sweep..." for a "SERIES TIED" line.
    const leadsMatch = summary.match(
      /(\w+)\s+LEADS?\s+SERIES\s+(\d+)\s*-\s*(\d+)/i
    );
    // Round context — names the real consequence ("reach the Finals")
    // instead of the generic "close the series."
    const ctx = `${g.seriesRound} ${g.seriesConference} ${g.gameContext}`.toLowerCase();
    const isFinals = /nba finals/.test(ctx);
    const isConfFinals = !isFinals && /conference finals|conf finals/.test(ctx);
    const clinchPhrase = isFinals
      ? "win the title"
      : isConfFinals
        ? "reach the Finals"
        : "close the series";

    if (leadsMatch) {
      const leaderCode = leadsMatch[1].toUpperCase();
      const hi = parseInt(leadsMatch[2], 10);
      // Name the trailing team explicitly rather than "the trailing side."
      const away = g.away.abbreviation.toUpperCase();
      const home = g.home.abbreviation.toUpperCase();
      const trailCode =
        leaderCode === away ? home : leaderCode === home ? away : home;
      const leaderName = getTeam(leaderCode)?.name ?? leaderCode;
      const trailName = getTeam(trailCode)?.name ?? trailCode;

      if (hi === 3) {
        worthKnowing.push(
          `${leaderName} can ${clinchPhrase} tonight. ${trailName} are eliminated with a loss.`
        );
      }
    } else if (/TIED\s+3\s*-\s*3/i.test(summary)) {
      worthKnowing.push(
        isFinals
          ? "Game 7. The title is on the line."
          : isConfFinals
            ? "Game 7. The winner reaches the Finals."
            : "Game 7. The winner takes the series."
      );
    }
  }

  // World Cup anticipation countdown (pre-kickoff). Rides along on briefs
  // already sending for other reasons — never triggers a send on its own
  // (shouldSendBrief ignores it), so it can't become a daily countdown
  // nag. Shows the followed country's group when there is one.
  let countdown: BriefPayload["countdown"];
  const msToKickoff = WC_KICKOFF.getTime() - now.getTime();
  const followsWorldCup =
    follows.some((f) => f.kind === "country") ||
    follows.some(
      (f) => f.kind === "tournament" && f.id.startsWith("fifa-world-cup-")
    );
  if (msToKickoff > 0 && followsWorldCup) {
    const days = Math.ceil(msToKickoff / 86_400_000);
    const countryFollow = follows.find((f) => f.kind === "country");
    const country = countryFollow ? getCountry(countryFollow.id) : null;
    let text: string;
    if (country) {
      const mates = WC_COUNTRIES.filter(
        (c) => c.group === country.group && c.id !== country.id
      ).map((c) => c.name);
      text = mates.length
        ? `${country.name} in Group ${country.group} with ${listWithAnd(mates)}. First whistle June 11.`
        : `${country.name} in Group ${country.group}. First whistle June 11.`;
    } else {
      text = "48 nations, 12 groups. First whistle June 11.";
    }
    countdown = { number: days, accentLabel: "Days · World Cup", text };
  }

  // Alerts summary. Tier labels mirror PRESETS in state/types.ts (kept
  // in sync manually rather than imported to keep this composer free
  // of client-only types).
  const enabledFollows = follows.filter((f) => f.alertEnabled);
  const tiers = enabledFollows.slice(0, 5).map((f) => {
    const label =
      f.alertTier === "all"
        ? "Close games"
        : f.alertTier === "companion"
          ? "Companion"
          : "Quiet";
    return `${followLabel(f)} · ${label}`;
  });

  // Structured date parts for the masthead (the email renders weekday in
  // a gutter + "Month Day." as the headline + per-section sublabels). Short
  // month keeps the big headline on one line across every month.
  const weekday = now.toLocaleDateString("en-US", {
    timeZone: SPORTS_TZ,
    weekday: "long",
  });
  const monthDay = now.toLocaleDateString("en-US", {
    timeZone: SPORTS_TZ,
    month: "short",
    day: "numeric",
  });
  const yDate = new Date(now.getTime() - 86_400_000);
  const yesterdayMonthDay = yDate.toLocaleDateString("en-US", {
    timeZone: SPORTS_TZ,
    month: "short",
    day: "numeric",
  });

  // Vanity issue number — days since the Brief's first issue. Purely
  // cosmetic ("Your Brief · 142"); deterministic from the date.
  const BRIEF_EPOCH = Date.UTC(2026, 0, 1);
  const issueNumber = Math.max(
    1,
    Math.floor((now.getTime() - BRIEF_EPOCH) / 86_400_000) + 1
  );

  return {
    dateLabel: todayHeader(now),
    weekday,
    monthDay,
    yesterdayMonthDay,
    issueNumber,
    yesterday,
    today,
    worthKnowing,
    countdown,
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

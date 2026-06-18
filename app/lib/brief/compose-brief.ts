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
import { deriveSeriesStake } from "../../companion/stakes/series-stakes";
import { getSeriesSnippets } from "../insights/context-snippets";
import type { Game } from "../../nba/types";

// First whistle of the Summer Soccer. Defined locally so the composer stays
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
  /** Optional anticipatory countdown for "Worth knowing" — the Summer Soccer
   *  run-up. Renders as a big accent numeral + label + sentence. Only set
   *  pre-kickoff for subscribers who follow a country or the tournament;
   *  never the sole reason a brief sends. */
  countdown?: {
    number: number;
    accentLabel: string; // "Days · Summer Soccer"
    text: string;
  };
  /** Calm summary of the subscriber's follow + alert state. */
  alerts: {
    summary: string; // "2 teams · 1 country"
    enabled: number; // # of follows with alertEnabled
    tiers: string[]; // ["Türkiye · Companion", "NBA Playoffs · All"]
  };
  /** Editorial lede — a one-time, curated, moment-driven intro that
   *  leads the brief above the sections. Used for Big Moments (Finals
   *  matchup set, a championship clinched). Date-windowed and
   *  follow-gated so it never becomes a recurring nag. Spoiler-gated:
   *  only set when the subscriber has includeScores on, since it names
   *  outcomes ("SA advanced to the Finals"). */
  editorialLede?: {
    headline: string; // "San Antonio is headed to the Finals."
    body: string;     // the prose paragraph
    context: string[]; // italic factual one-liners (the snippet layer)
  };
};

// ── Editorial lede (curated Big Moments) ─────────────────────────────
//
// A hand-authored intro for a specific moment, shown to relevant
// followers inside a tight date window. This is the calm-commentary
// layer at the top of the brief. Add entries here for Finals, clinches,
// Game 7 results — the handful of moments that deserve a lede. When the
// window passes, the lede stops showing on its own.
//
// Voice: declarative, specific dates, no hype. The context lines come
// from the shared context-snippets module so the Brief and the in-app
// Stakes line never drift.
type EditorialMoment = {
  /** ET date window [start, end) the lede shows in, inclusive start. */
  startKey: string; // "YYYY-MM-DD"
  endKey: string;   // exclusive
  headline: string;
  body: string;
  /** Series team codes to pull context snippets from (any order). */
  seriesContext?: [string, string];
  /** Predicate: does this subscriber's follow set qualify? */
  appliesTo: (follows: Follow[]) => boolean;
};

const followsNBA = (follows: Follow[]): boolean =>
  follows.some(
    (f) =>
      (f.kind === "tournament" && f.id.startsWith("nba-playoffs-")) ||
      (f.kind === "team" && ["SA", "NYK", "OKC", "CLE"].includes(f.id)) ||
      (f.kind === "series" &&
        /\b(SA|NYK|OKC|CLE)\b/.test(f.id))
  );

// Follows ANY Summer Soccer surface. Used by the WC editorial moments below
// so a user who only follows the WC (a country or the tournament itself)
// still sees a calm pre-kickoff acknowledgment in their daily brief.
const followsWC = (follows: Follow[]): boolean =>
  follows.some(
    (f) =>
      (f.kind === "tournament" && f.id.startsWith("fifa-world-cup-")) ||
      f.kind === "country"
  );

const EDITORIAL_MOMENTS: EditorialMoment[] = [
  {
    // 2026 NBA Finals matchup set. Shows from the morning after SA's
    // Game 7 through the day before Game 1 (Wednesday June 3).
    startKey: "2026-05-31",
    endKey: "2026-06-04",
    headline: "San Antonio is headed to the Finals.",
    body: "Last night, San Antonio closed out Oklahoma City in Game 7. They advance to face New York in the Finals. Series tips Wednesday.",
    seriesContext: ["SA", "NYK"],
    appliesTo: followsNBA,
  },
  {
    // The morning after Game 1, through the next several days. Calm
    // factual acknowledgment that the Finals are running — no claims
    // about who won (the daily recap handles per-game outcomes); the
    // schedule is fact-only. Window ends June 11 so the WC kickoff
    // moment below takes over for users who follow both sports.
    startKey: "2026-06-04",
    endKey: "2026-06-11",
    headline: "The Finals are underway.",
    body: "Series tipped Wednesday. Best-of-seven, first to four wins.",
    seriesContext: ["SA", "NYK"],
    appliesTo: followsNBA,
  },
  {
    // WC pre-kickoff anticipation (the final week of buildup). Fires
    // for WC followers only — NBA followers stay on the Finals moment
    // above since the array is iterated in order.
    startKey: "2026-06-04",
    endKey: "2026-06-11",
    headline: "The Summer Soccer is days away.",
    body: "First whistle Thursday, June 11. A month of international soccer.",
    appliesTo: followsWC,
  },
  // ── Summer Soccer lifecycle (kickoff → wrapped) ───────────────────────
  // Date-keyed to the real 2026 schedule (group stage through Jun 24,
  // R32 Jun 28, Final Jul 19 — see WC_KNOCKOUT_ROUNDS in wc-fixtures.ts).
  // "Opening match today" used to fire Jun 11–13, which read as wrong on
  // Jun 12–13. Each state now matches the actual calendar day and never
  // claims fake precision.
  {
    // Opening day only.
    startKey: "2026-06-11",
    endKey: "2026-06-12",
    headline: "The Summer Soccer is here.",
    body: "Opening match today. Group stage runs through June 24.",
    appliesTo: followsWC,
  },
  {
    // Group stage in progress (Jun 12 → Jun 24).
    startKey: "2026-06-12",
    endKey: "2026-06-25",
    headline: "The Summer Soccer is underway.",
    body: "Group stage continues, matches most days through June 24.",
    appliesTo: followsWC,
  },
  {
    // Between the group stage and the knockouts (Jun 25 → Jun 27).
    startKey: "2026-06-25",
    endKey: "2026-06-28",
    headline: "Group stage is done.",
    body: "The knockout rounds begin June 28.",
    appliesTo: followsWC,
  },
  {
    // Knockout rounds (Jun 28 → Jul 18).
    startKey: "2026-06-28",
    endKey: "2026-07-19",
    headline: "The knockout rounds are on.",
    body: "Win or go home, through to the final on July 19.",
    appliesTo: followsWC,
  },
  {
    // Final day.
    startKey: "2026-07-19",
    endKey: "2026-07-20",
    headline: "The Summer Soccer final is today.",
    body: "One match decides it.",
    appliesTo: followsWC,
  },
  {
    // Post-tournament wrap (the week after).
    startKey: "2026-07-20",
    endKey: "2026-07-27",
    headline: "The Summer Soccer is wrapped.",
    body: "That is the tournament. Thanks for following along.",
    appliesTo: followsWC,
  },
];

function deriveEditorialLede(
  follows: Follow[],
  includeScores: boolean,
  now: Date
): BriefPayload["editorialLede"] {
  // Naming an outcome ("advanced to the Finals") is a spoiler. Respect
  // the subscriber's No-Spoilers choice the same way every other section
  // does.
  if (!includeScores) return undefined;
  const todayKey = etDateKey(now);
  for (const m of EDITORIAL_MOMENTS) {
    if (todayKey < m.startKey || todayKey >= m.endKey) continue;
    if (!m.appliesTo(follows)) continue;
    const context = m.seriesContext
      ? getSeriesSnippets(m.seriesContext[0], m.seriesContext[1])?.snippets ?? []
      : [];
    return { headline: m.headline, body: m.body, context };
  }
  return undefined;
}

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

// Summer Soccer game shape the brief needs. Defined locally (not imported
// from today-data) to keep this composer free of client-only modules,
// the same way the NBA path leans on the lean `Game` type. Matches the
// /api/world-cup response — the caller hands the games straight through.
export type BriefWCGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  stage?: string;
  group?: string;
  home: { abbreviation: string; name: string; score: number };
  away: { abbreviation: string; name: string; score: number };
};

function wcGameMatchesFollow(game: BriefWCGame, follow: Follow): boolean {
  switch (follow.kind) {
    case "country":
      return (
        game.home.abbreviation === follow.id ||
        game.away.abbreviation === follow.id
      );
    case "tournament":
      return follow.id.startsWith("fifa-world-cup-");
    case "team":
    case "series":
      return false; // these don't drive Summer Soccer matches
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
  wc = [],
  now = new Date(),
}: {
  subscriber: BriefSubscriber;
  /** NBA game list — should be the seriesGames window (~14d) so
   *  yesterday's finals are included even at week-boundary days. */
  nba: Game[];
  /** Summer Soccer fixtures from /api/world-cup (its ~14-day window already
   *  covers yesterday + today). Optional so NBA-only callers and the
   *  test suite stay valid; defaults to an empty slate. */
  wc?: BriefWCGame[];
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

  // Yesterday, Summer Soccer: finals matching a country / tournament follow.
  // Appended after the NBA finals so the brief reads sport-by-sport
  // rather than time-interleaved (calmer, and clearer for a follower of
  // both). Scores stay gated on includeScores, same as NBA.
  const wcYesterday: BriefGameRow[] = wc
    .filter(
      (g) =>
        g.status === "final" &&
        isYesterday(g.date, now) &&
        follows.some((f) => wcGameMatchesFollow(g, f))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((g) => ({
      source: "wc",
      matchup: `${g.away.abbreviation} · ${g.home.abbreviation}`,
      scoreLine: subscriber.includeScores
        ? `${g.away.score} – ${g.home.score}`
        : null,
      status: g.status,
      context: subscriber.includeScores
        ? `Full time${g.stage ? ` · ${g.stage}` : ""}`
        : "Full time.",
      href: `/game/${g.id}`,
    }));

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
      // A live game reads "Live", not a kickoff time. Mirrors the WC
      // rows below; without this a live NBA game in the morning Brief
      // showed its tip-off time as if it hadn't started.
      const context =
        g.status === "live"
          ? `Live${g.gameContext ? ` · ${g.gameContext}` : ""}`
          : `${formatGameTime(g.date)}${
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

  // Today, Summer Soccer: live or upcoming matches for followed countries /
  // the tournament. Live matches show a calm "Live" context (and the
  // score when scores are on); upcoming show kickoff time.
  const wcToday: BriefGameRow[] = wc
    .filter(
      (g) =>
        (g.status === "upcoming" || g.status === "live") &&
        isToday(g.date, now) &&
        follows.some((f) => wcGameMatchesFollow(g, f))
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((g) => ({
      source: "wc",
      matchup: `${g.away.abbreviation} · ${g.home.abbreviation}`,
      scoreLine:
        g.status === "live" && subscriber.includeScores
          ? `${g.away.score} – ${g.home.score}`
          : null,
      status: g.status,
      context:
        g.status === "live"
          ? `Live${g.stage ? ` · ${g.stage}` : ""}`
          : `${formatGameTime(g.date)}${g.stage ? ` · ${g.stage}` : ""}`,
      href: `/game/${g.id}`,
    }));

  // Worth knowing: stake context for today's games. Uses the SAME
  // shared `deriveSeriesStake` the in-app StakesLine uses, so the copy
  // can't drift between the app and the email. We only surface the
  // "urgent" stakes (clinch / Game 7) here to keep the Brief calm.
  const worthKnowing: string[] = [];
  if (subscriber.includeScores) {
    for (const g of todayGames) {
      const stake = deriveSeriesStake(g);
      if (stake?.urgent) worthKnowing.push(stake.line);
    }
  }

  // Summer Soccer anticipation countdown (pre-kickoff). Rides along on briefs
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
      text = "Group stage to the final. First whistle June 11.";
    }
    countdown = { number: days, accentLabel: "Days · Summer Soccer", text };
  }

  // Alerts summary. Tier labels mirror PRESETS in state/types.ts (kept
  // in sync manually rather than imported to keep this composer free
  // of client-only types).
  const enabledFollows = follows.filter((f) => f.alertEnabled);
  const tiers = enabledFollows.slice(0, 5).map((f) => {
    const label =
      f.alertTier === "all"
        ? "Full Details"
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

  const editorialLede = deriveEditorialLede(
    follows,
    subscriber.includeScores,
    now
  );

  return {
    dateLabel: todayHeader(now),
    weekday,
    monthDay,
    yesterdayMonthDay,
    issueNumber,
    yesterday: [...yesterday, ...wcYesterday],
    today: [...today, ...wcToday],
    worthKnowing,
    countdown,
    alerts: {
      summary: summarizeFollowKinds(follows),
      enabled: enabledFollows.length,
      tiers,
    },
    editorialLede,
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

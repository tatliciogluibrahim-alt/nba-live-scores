// Today data layer — pure adapters. Input: the existing API responses we
// already ship. Output: a single TodayPayload tuned for the Today composition.
// Keep all "what to surface" logic here so the screen file stays a layout.

import type { Follow, PinnedGame } from "../state/types";
import { getCountry } from "../following/data/countries";
import { getTournament } from "../following/data/tournaments";
import { prettifySeriesSummary } from "../../nba/lib/series";
import {
  countryKnockoutOutcome,
  knockoutResult,
  nextStageLabel,
} from "../tournament/knockout-data";

// ── Minimal shapes lifted from /api/live-scores + /api/world-cup ─────
// We intentionally keep these decoupled from the legacy route types so
// the adapters can evolve without touching the monoliths.

export type NBAGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  period: number;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
  home: { name: string; abbreviation: string; score: number; logo: string };
  away: { name: string; abbreviation: string; score: number; logo: string };
  broadcasts: string[];
};

export type WCGameLite = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  stage: string;
  group: string;
  home: { id?: string; name: string; abbreviation: string; score: number };
  away: { id?: string; name: string; abbreviation: string; score: number };
  events?: WCMatchEventLite[];
  penaltyHome?: number | null;
  penaltyAway?: number | null;
  broadcasts: string[];
  watchLabel: string;
};

export type WCMatchEventLite = {
  minute: string;
  type: "goal" | "pen_goal" | "own_goal" | "red_card" | "yellow_card";
  playerName: string;
  assistName?: string;
  teamId: string;
};

// ── Today payload shape ───────────────────────────────────────────────

export type TodayHeroKind =
  | "nba-live"
  | "wc-live"
  | "nba-upcoming"
  | "wc-countdown"
  | null;

export type TodayHero = {
  kind: NonNullable<TodayHeroKind>;
  eyebrow: string;
  headline: string;
  context?: string;
  /** Series stake, humanized from seriesSummary ("OKC leads series 3-2").
   *  Only set for playoff/series games. Drives the Front Page support
   *  line under the deck. */
  stake?: string;
  live: boolean;
  accent: "var(--nba)" | "var(--wc)";
  /** True when this hero is being surfaced because the user pinned the game. */
  pinned?: boolean;
  /** Where tapping the hero goes (Stage 1 placeholder routes for now). */
  href: string;
  /** When set, the No-Spoilers variant uses this matchup string. */
  spoilerMatchup?: string;
  spoilerKind?: "live" | "final" | "series";
  spoilerSubject?: string;
  watch?: { channel: string; stream?: string };
};

export type YouFollowItem = {
  kind: Follow["kind"];
  id: string;
  label: string;
  /** Short identity mark — same chip text as the Following tab card.
   *  Team: "NYK" · Country: "🇺🇸" · Series: "NYK · CLE" · Tournament: "CUP" */
  chip: string;
  statusLabel: string;       // "Live" | "Tonight" | "Sat" | "Out" | "Quiet"
  tone: "live" | "upcoming" | "final" | "current";
  href: string;
};

/** Tag every Today item with the source league so consumers can branch
 *  without sniffing optional fields like `stage`. */
export type TodaySource = "nba" | "wc";

export type UpNextItem = {
  source: TodaySource;
  id: string;
  /** True when this game is in the user's pinned list. */
  pinned: boolean;
  /** True when at least one team/country in this game belongs to the user's
   *  follows. Personal games get a stronger visual treatment so the eye
   *  can instantly tell "mine" from the generic feed filler. */
  personal: boolean;
  eyebrow: string;           // "NBA · Tonight" | "Summer Soccer · Sat"
  headline: string;          // "Knicks vs Cavaliers"
  detail: string;            // "8:00 PM · MSG"
  /** True when this game is on the current calendar day. The Front Page
   *  headline counts only today's games ("One game tonight."), so a
   *  future "Game 7 if necessary" in the list doesn't inflate the count. */
  isToday: boolean;
  /** Headline-ready day word for non-today games ("tomorrow",
   *  "Saturday"). Used when nothing is on today and the headline leads
   *  with the soonest upcoming day instead. */
  dayWord: string;
  /** Series stake, humanized ("OKC leads series 3-2"). NBA series games
   *  only; undefined for plain games and Summer Soccer fixtures. */
  stake?: string;
  watch?: { channel: string; stream?: string };
  href: string;
  spoilerSubject: string;
};

export type QuietWrapItem = {
  source: TodaySource;
  id: string;
  eyebrow: string;           // "Yesterday"
  matchup: string;           // "Thunder · Spurs"
  scoreLine: string;         // "121 – 109"
  context?: string;          // "Thunder beat Spurs"
  spoilerSubject: string;
  kind: "final" | "series";
  href: string;
};

export type ReminderRow = {
  text: string;              // "Summer Soccer kicks off in 20 days."
  detail?: string;           // "Mexico City · Group A"
  href?: string;
};

// ── Pinned game summary ───────────────────────────────────────────────
// Status-bucketed summary of the user's pinned games. The daily brief
// uses this to pick the right copy + CTA per state — without it, the
// brief defaults to "pinned for later" even when the pinned game is
// final (the original bug).
//
// "primary" is the pinned game the brief CTA should point at when one
// pin earns a deep link instead of /watching. Priority: live first
// (most actionable), then upcoming (next-up matters), then final
// (recap is the moment), then unresolved (let Watching handle the
// stale-pin unpin flow).

export type PinnedStatusBucket = "live" | "upcoming" | "final" | "unresolved";

export type PinnedSummary = {
  total: number;
  live: number;
  upcoming: number;
  final: number;
  /** Pins whose game wasn't found in the current week NBA feed, the
   *  recent-games feed, or the WC feed. The Watching page's snapshot
   *  fallback can still rescue these — but for the brief, they're an
   *  "unavailable" signal. */
  unresolved: number;
  /** A representative pin for the brief's CTA. Null when no pins. */
  primary: {
    gameId: string;
    status: PinnedStatusBucket;
    /** Always /game/{id} when the pin resolved; /watching for
     *  unresolved pins (Watching handles unpin / snapshot fallback). */
    href: string;
  } | null;
};

// ── Closing moment ────────────────────────────────────────────────────
// A "calm ending" card. Two variants share one shape: a series the user
// follows just wrapped, OR the NBA Finals just wrapped and the slate is
// otherwise quiet (the "wind-down" case). The card has no urgency. It
// acknowledges, sums up, and offers at most one next action.
//
// Dismissal lives in localStorage on the client (see
// use-closing-dismissed.ts). The data layer always computes the moment
// if it qualifies; the view layer suppresses it if dismissed.

export type ClosingMomentDot = {
  /** 1..N — only includes games actually played. */
  number: number;
  awayCode: string;
  homeCode: string;
  /** Abbreviation of the winning team. Spoilery — view layer gates on
   *  No-Spoilers. */
  winnerCode: string;
};

/** A single follow rendered as a chip in the "still in your circle"
 *  list. The view links straight to that follow's detail page. */
export type ClosingCircleItem = {
  key: string;
  label: string;
  href: string;
};

export type ClosingMoment = {
  /** Stable id for dismiss tracking. Series: "series:<sorted-key>".
   *  Tournament: "tournament:nba-<year>". Dead zone: "deadzone:<day>". */
  id: string;
  kind: "series" | "tournament" | "deadzone";
  /** "SERIES WRAPPED" or "SEASON WRAPPED" eyebrow. Always safe. */
  eyebrow: string;
  /** Calm headline. Safe under No-Spoilers. */
  headline: string;
  /** Optional detail line. Safe under No-Spoilers. */
  detail?: string;
  /** Game-by-game dots for the series variant. Empty for tournament. */
  dots: ClosingMomentDot[];
  /** Spoilery summary line (e.g. "OKC took it in 6."). Only shown when
   *  No-Spoilers is off. */
  spoilerSummary?: string;
  /** At most one CTA. */
  primary?: { label: string; href: string };
  /** When set, the CTA is "Follow [code]" — view passes through to the
   *  follow toggle. Null when no follow action is appropriate (user
   *  already follows everyone, or tournament variant). */
  followSuggestion?: { kind: "team"; id: string; label: string };
  /** "Still in your circle" redirect. Populated in two cases:
   *    • Series wrapped AND the user followed the LOSING team — we
   *      surface their OTHER follows so the emotional investment has
   *      somewhere to go (Phase 21C series-closure suggestion).
   *    • Dead-zone bridge — the circle is quiet (nothing live/upcoming)
   *      so we list what the user still follows as a reminder it'll
   *      come back to life (Phase 21C dead-zone bridge).
   *  Each item links to that follow's detail page. Empty/undefined when
   *  there's nothing useful to redirect to. */
  circleHeading?: string;
  circle?: ClosingCircleItem[];
  /** When set, the view layer auto-removes this follow on mount — the
   *  series is over, so the series follow is dead weight taking an
   *  alert slot. Only set for the SERIES follow (never a team follow:
   *  the user may still want to follow a team into the next round).
   *  Fully-automatic per the Finals-era alerts principles. */
  autoDropFollow?: { kind: "series"; id: string };
  /** Calm one-line acknowledgment shown on the card when a follow was
   *  auto-retired, so the removal isn't silent (honors "you're in
   *  control"). Only set alongside autoDropFollow. */
  autoDropNote?: string;
};

/** A knockout advancement / elimination moment for a followed country
 *  whose knockout match just finished. The headline and score are
 *  spoilery — the view gates them under No-Spoilers. At most one per
 *  followed country (the most recent decided knockout match). */
export type KnockoutMomentItem = {
  /** Stable id for dismiss tracking: "ko:<gameId>:<countryCode>". */
  id: string;
  countryCode: string;
  countryName: string;
  outcome: "advanced" | "eliminated";
  /** The round just played, e.g. "Round of 32". */
  stageLabel: string;
  /** Where the winner goes next ("Quarterfinals"), or "Champions" if they
   *  won the final. Empty for an elimination. */
  nextStage: string;
  /** True when the country won the Final (tournament champions). */
  isChampion: boolean;
  /** Spoilery final line, e.g. "USA 1 – POR 2". */
  scoreLine: string;
  href: string;
};

export type TodayPayload = {
  hero: TodayHero | null;
  youFollow: YouFollowItem[];
  upNext: UpNextItem[];
  quietWrap: QuietWrapItem[];
  reminder: ReminderRow | null;
  /** When true, the parent renders the "Calm is a feature" card at the bottom. */
  isQuietDay: boolean;
  /** When true, Today is in its resting state (design C): nothing live,
   *  games coming up, nothing just-wrapped. The view shows the calm
   *  "Quiet for now." lead + Next up list instead of the live hero. */
  restingState: boolean;
  /** True when every game on today's slate has finished — no live, no
   *  upcoming, ≥1 final. The Quiet Recap full-screen moment uses this
   *  signal (Stage 15F) to render its end-of-night acknowledgement. */
  slateComplete: boolean;
  /** Headline count for the recap copy. Always finals.length when
   *  slateComplete is true; 0 otherwise. */
  finalsCount: number;
  /** A "calm ending" card the user might see today. At most one. Either
   *  a followed series just wrapped, or the NBA Finals just wrapped and
   *  the slate is otherwise quiet. Dismissal is client-side
   *  (localStorage), so the data layer always returns the moment when
   *  it qualifies — the view layer suppresses if dismissed. */
  closing: ClosingMoment | null;
  /** Status-bucketed view of the user's pinned games. The daily brief
   *  uses this to disambiguate "pinned for later" (upcoming) from
   *  "wrapped" (final) — pre-fix, the brief said "later" for any pin
   *  regardless of actual status. */
  pinnedSummary: PinnedSummary;
  /** Knockout advancement / elimination moments for followed countries
   *  whose knockout match just finished. Usually empty; at most one per
   *  followed country. Each self-suppresses once dismissed (view layer). */
  knockoutMoments: KnockoutMomentItem[];
  /** Desktop multi-game scoreboard: the user's followed games that are
   *  live now or coming today, score-forward. Empty on mobile-irrelevant
   *  quiet days. Desktop renders these as a dense grid; mobile ignores it
   *  in favor of the single calm lead. */
  scoreboard: ScoreboardTile[];
};

/** One tile in the desktop scoreboard grid. Score-forward; null scores for
 *  upcoming games. */
export type ScoreboardTile = {
  id: string;
  source: TodaySource;
  awayCode: string;
  homeCode: string;
  awayScore: number | null;
  homeScore: number | null;
  status: "live" | "upcoming";
  /** "67'" / "Q3 · 4:21" / "8:00 PM". */
  statusLine: string;
  /** "Summer Soccer · Group L" / "NBA · Game 6". */
  stageLine: string;
  href: string;
  /** Leader emphasis for live tiles; null on tie / upcoming. */
  lead: "away" | "home" | null;
};

// ── Pure helpers ──────────────────────────────────────────────────────

export const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

export function daysUntil(target: Date, now = new Date()): number {
  const ms = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// `sport` picks the same-day word: NBA games skew evening ("Tonight"),
// Summer Soccer games are daytime in the US ("Today"). Without this a noon
// Summer Soccer match read "Tonight," contradicting the "games today."
// headline on the same screen.
function formatGameDay(
  date: string,
  now = new Date(),
  sport: "nba" | "wc" = "nba"
): string {
  const d = new Date(date);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return sport === "wc" ? "Today" : "Tonight";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow";
  }

  // A bare weekday ("Thu") only reads unambiguously within the current
  // week. Beyond ~6 days a game would read as "this Thursday" when it's
  // actually next week or further (e.g. a Summer Soccer opener 10 days out).
  // Past that horizon, show the date instead.
  if (daysUntil(d, now) <= 6) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatGameTime(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** True when `date` falls on the same calendar day as `now`. */
function isSameDay(date: string, now = new Date()): boolean {
  const d = new Date(date);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Headline-ready day word for a non-today game: "tomorrow" or a full
 *  weekday ("Saturday"). Today returns "" — the headline uses the
 *  tone-aware whenWord ("tonight"/"today") for same-day games instead. */
function headlineDayWord(date: string, now = new Date()): string {
  if (isSameDay(date, now)) return "";
  const d = new Date(date);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) {
    return "tomorrow";
  }
  // Same horizon rule as formatGameDay: weekday within the week, date
  // beyond it, so a far-off game never reads as "this Saturday."
  if (daysUntil(d, now) <= 6) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function gameIncludesTeam(g: NBAGame, abbr: string): boolean {
  return g.away.abbreviation === abbr || g.home.abbreviation === abbr;
}

function gameIncludesCountry(g: WCGameLite, code: string): boolean {
  return g.away.abbreviation === code || g.home.abbreviation === code;
}

// Most relevant game for a follow: live now > soonest upcoming > most recent
// final. A plain .find() returned feed order, so a chip could read "Final"
// while the team was actually live, and the hero could name a different game
// than Up Next's first row.
function pickRelevantGame<T extends { status: string; date: string }>(
  games: T[]
): T | undefined {
  return (
    games.find((g) => g.status === "live") ??
    games
      .filter((g) => g.status === "upcoming")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ??
    games
      .filter((g) => g.status === "final")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  );
}

// ── Hero pick ─────────────────────────────────────────────────────────
// One earned moment. Preference order:
//   1. A live NBA game involving a followed team
//   2. Any live NBA game (closest score in latest period wins)
//   3. The next upcoming NBA game for a followed team
//   4. The WC countdown reminder dressed up as a hero (when no NBA hero exists)

function scoreClosenessRank(g: NBAGame): number {
  // Lower = more interesting. Late-period close games rank lowest.
  if (g.status !== "live") return Number.POSITIVE_INFINITY;
  const diff = Math.abs(g.home.score - g.away.score);
  const period = Math.max(1, g.period);
  // Bigger period = closer to the end = more weight on tight scores.
  return diff * 4 - period * 6;
}

function pickHero(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  pinned: PinnedGame[],
  now: Date = new Date()
): TodayHero | null {
  const followedTeams = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );
  const pinnedIds = new Set(pinned.map((p) => p.gameId));

  const followedCountries = new Set(
    follows.filter((f) => f.kind === "country").map((f) => f.id)
  );

  const live = [...nba.filter((g) => g.status === "live")].sort(
    (a, b) => scoreClosenessRank(a) - scoreClosenessRank(b)
  );
  const wcLive = wc.filter((g) => g.status === "live");

  // Hero priority spans both sports. A live game (either sport) beats an
  // upcoming one. Within "live", a pinned or followed match is the
  // strongest "I care" signal; NBA wins ties only when neither side is
  // explicitly cared-about. Without this, a live followed WC match
  // (e.g. USA at the Summer Soccer) never reached the hero — it was
  // NBA-only before.
  const nbaCared =
    live.find((g) => pinnedIds.has(g.id)) ??
    live.find((g) => [...followedTeams].some((abbr) => gameIncludesTeam(g, abbr)));
  const wcCared =
    wcLive.find((g) => pinnedIds.has(g.id)) ??
    wcLive.find((g) => [...followedCountries].some((c) => gameIncludesCountry(g, c)));

  // Resolve to one live hero, preferring cared-about matches.
  const heroLive = nbaCared ?? (wcCared ? null : live[0]);
  const heroWcLive = !heroLive ? (wcCared ?? wcLive[0]) : null;

  if (heroWcLive) {
    const isPinned = pinnedIds.has(heroWcLive.id);
    const stage = heroWcLive.stage ? `Summer Soccer · ${heroWcLive.stage}` : "Summer Soccer";
    // Busy-slate count must reflect the user's FOLLOWED live matches, not the
    // whole feed — a feed-wide count ("6 live now") beside one shown game is
    // a lie (RC4). A tournament follow covers every match; otherwise count
    // pinned + followed-country live games.
    const followsWcTour = follows.some(
      (f) => f.kind === "tournament" && getTournament(f.id)?.accent === "var(--wc)"
    );
    const followedWcLiveCount = wcLive.filter(
      (g) =>
        followsWcTour ||
        pinnedIds.has(g.id) ||
        [...followedCountries].some((c) => gameIncludesCountry(g, c))
    ).length;
    return {
      kind: "wc-live",
      eyebrow: isPinned ? `Pinned · ${stage}` : stage,
      headline: deriveWCLiveHeadline(heroWcLive),
      // Busy-slate signal: when more than one FOLLOWED match is live, name the
      // count so the hero doesn't look like the only thing on. Calm and
      // factual, no FOMO. Matches the scoreboard's live set.
      context:
        followedWcLiveCount > 1
          ? `${followedWcLiveCount} Summer Soccer matches live now.`
          : undefined,
      live: true,
      accent: "var(--wc)",
      pinned: isPinned,
      href: `/game/${heroWcLive.id}`,
      spoilerMatchup: `${heroWcLive.away.abbreviation} vs ${heroWcLive.home.abbreviation}`,
      spoilerKind: "live",
      spoilerSubject: `${heroWcLive.away.abbreviation} vs ${heroWcLive.home.abbreviation}`,
      watch: heroWcLive.broadcasts[0]
        ? { channel: heroWcLive.broadcasts[0] }
        : undefined,
    };
  }

  if (heroLive) {
    const isPinned = pinnedIds.has(heroLive.id);
    const baseEyebrow = heroLive.gameContext || "NBA · Live";
    const watch = heroLive.broadcasts[0]
      ? { channel: heroLive.broadcasts[0] }
      : undefined;
    return {
      kind: "nba-live",
      eyebrow: isPinned ? `Pinned · ${baseEyebrow}` : baseEyebrow,
      headline: deriveLiveHeadline(heroLive),
      context: heroLive.seriesSummary || undefined,
      stake: heroLive.seriesSummary
        ? prettifySeriesSummary(heroLive.seriesSummary)
        : undefined,
      live: true,
      accent: "var(--nba)",
      pinned: isPinned,
      href: `/game/${heroLive.id}`,
      spoilerMatchup: heroLive.matchup,
      spoilerKind: "live",
      spoilerSubject: heroLive.matchup,
      watch,
    };
  }

  // No live game — try the next upcoming followed-team game today
  // Sorted soonest-first so the hero names the NEXT followed game, matching
  // Up Next's first row instead of whatever the feed happened to list first.
  const todayNBA = nba
    .filter((g) => g.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const todayFollowed = todayNBA.find((g) =>
    [...followedTeams].some((abbr) => gameIncludesTeam(g, abbr))
  );
  if (todayFollowed) {
    return {
      kind: "nba-upcoming",
      eyebrow: "Next up · NBA",
      headline: `${todayFollowed.away.abbreviation} vs ${todayFollowed.home.abbreviation}`,
      context: `${formatGameDay(todayFollowed.date)} · ${formatGameTime(todayFollowed.date)}`,
      stake: todayFollowed.seriesSummary
        ? prettifySeriesSummary(todayFollowed.seriesSummary)
        : undefined,
      live: false,
      accent: "var(--nba)",
      href: `/game/${todayFollowed.id}`,
      spoilerMatchup: todayFollowed.matchup,
      spoilerKind: "live",
      spoilerSubject: todayFollowed.matchup,
      watch: todayFollowed.broadcasts[0]
        ? { channel: todayFollowed.broadcasts[0] }
        : undefined,
    };
  }

  // Nothing live or imminent on NBA. We used to inflate the Summer Soccer
  // countdown into a hero card here ("17 days to first whistle"), but
  // the bottom ReminderRow already says exactly the same thing — and
  // does it as a calm one-liner, not a big editorial block at the top
  // of Today. Letting the hero stay empty when there's nothing live
  // honors the "what matters now" promise; the reminder picks up the
  // slack down the screen.
  //
  // Exception (Phase 8): the day of WC kickoff is a one-shot moment. If
  // we're inside the final 24h before first whistle (or the tournament
  // just opened today), and the user is following a country whose
  // opener is part of the action, the hero earns the editorial slot.
  const hoursUntilKickoff = (WC_KICKOFF.getTime() - now.getTime()) / 3_600_000;
  if (hoursUntilKickoff > 0 && hoursUntilKickoff <= 24) {
    const followedCountry = follows.find((f) => f.kind === "country");
    const country = followedCountry ? getCountry(followedCountry.id) : null;
    const hoursRounded = Math.max(1, Math.ceil(hoursUntilKickoff));
    return {
      kind: "wc-countdown",
      eyebrow: country ? "Tournament day" : "Summer Soccer 2026",
      headline: country
        ? `${country.name}'s tournament begins.`
        : "Summer Soccer kicks off today.",
      context:
        hoursRounded <= 6
          ? `Kicks off in ${hoursRounded} hour${hoursRounded === 1 ? "" : "s"}.`
          : `First whistle in ${hoursRounded} hours.`,
      live: false,
      accent: "var(--wc)",
      href: country ? `/country/${country.id}` : "/following/country",
    };
  }

  return null;
}

function deriveLiveHeadline(g: NBAGame): string {
  // Short, calm, score-free statements. The score lives in body type on the
  // detail screen (Stage 6). Today's hero stays moment-first.
  const diff = Math.abs(g.home.score - g.away.score);
  const inLate = g.period >= 4 || g.statusText.toUpperCase().includes("OT");

  if (inLate && diff <= 3) return "One-possession game.";
  if (inLate && diff <= 6) return "Final minutes are close.";
  if (g.statusText.toUpperCase().includes("HALF")) return "Halftime.";
  if (g.period >= 4) return "Fourth quarter underway.";
  if (g.period === 3) return "Third quarter underway.";
  if (g.period === 2) return "Second quarter underway.";
  return "Game is live.";
}

// Soccer-bespoke live headline for the hero. Calm, score-free.
function deriveWCLiveHeadline(g: WCGameLite): string {
  const text = (g.statusText ?? "").toLowerCase();
  if (text.includes("ht") || text.includes("half")) return "Halftime.";
  const m = text.match(/(\d{1,3})/);
  const min = m ? Number(m[1]) : null;
  if (min != null && min >= 90) return "Stoppage time.";
  if (min != null && min > 45) return "Second half underway.";
  if (min != null && min >= 1) return "First half underway.";
  return "Match is live.";
}

// ── You follow ────────────────────────────────────────────────────────

function buildYouFollow(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  now = new Date()
): YouFollowItem[] {
  return follows
    .map<YouFollowItem | null>((f) => {
      if (f.kind === "team") {
        const g = pickRelevantGame(nba.filter((x) => gameIncludesTeam(x, f.id)));
        if (g) {
          return {
            kind: "team",
            id: f.id,
            label: f.id,
            chip: f.id,
            statusLabel:
              g.status === "live"
                ? "Live"
                : g.status === "upcoming"
                  ? formatGameDay(g.date, now)
                  : "Final",
            tone:
              g.status === "live"
                ? "live"
                : g.status === "upcoming"
                  ? "upcoming"
                  : "final",
            href: `/game/${g.id}`,
          };
        }
        // No live or upcoming game for this team — chip routes to the
        // team detail page (/team/[abbr]) so users can see recent
        // results + series context. Pre-Phase-9 this fell back to
        // /following because no team detail page existed.
        return {
          kind: "team",
          id: f.id,
          label: f.id,
          chip: f.id,
          statusLabel: "Quiet",
          tone: "final",
          href: `/team/${f.id}`,
        };
      }
      if (f.kind === "country") {
        // Country code, not the flag emoji — flags were dropped from the
        // sports circle (kept only on share cards).
        const countryChip = f.id;
        const g = pickRelevantGame(wc.filter((x) => gameIncludesCountry(x, f.id)));
        if (g) {
          return {
            kind: "country",
            id: f.id,
            label: f.id,
            chip: countryChip,
            statusLabel:
              g.status === "live"
                ? "Live"
                : g.status === "upcoming"
                  ? formatGameDay(g.date, now)
                  : "Final",
            tone:
              g.status === "live"
                ? "live"
                : g.status === "upcoming"
                  ? "upcoming"
                  : "final",
            href: `/country/${f.id}`,
          };
        }
        const days = daysUntil(WC_KICKOFF, now);
        return {
          kind: "country",
          id: f.id,
          label: f.id,
          chip: countryChip,
          statusLabel: days > 0 ? `${days}d` : "Quiet",
          tone: "current",
          href: `/country/${f.id}`,
        };
      }
      if (f.kind === "series") {
        const [a, b] = f.id.split("-");
        return {
          kind: "series",
          id: f.id,
          label: f.id,
          chip: b ? `${a}·${b}` : f.id,
          statusLabel: "Series",
          tone: "current",
          href: `/series/${f.id}`,
        };
      }
      if (f.kind === "tournament") {
        const tournament = getTournament(f.id);
        return {
          kind: "tournament",
          id: f.id,
          label: tournament?.name ?? f.id,
          // A tournament chip shows its name, not a 3-letter code: "SOC"
          // reads like a team abbreviation next to AUT / ARG. The pill
          // can carry the full name since tournament follows are few.
          chip: tournament?.name ?? "Tournament",
          statusLabel: "Cup",
          tone: "current",
          // /tournament/[id] became a real detail page in Phase 9 —
          // chip routes there now instead of falling back to /following.
          href: `/tournament/${f.id}`,
        };
      }
      return null;
    })
    .filter((x): x is YouFollowItem => x !== null);
}

// ── Up next ───────────────────────────────────────────────────────────

function nbaToUpNext(g: NBAGame, pinned: boolean, personal: boolean): UpNextItem {
  return {
    source: "nba",
    id: g.id,
    pinned,
    personal,
    eyebrow: `NBA · ${formatGameDay(g.date)}`,
    headline: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
    detail: `${formatGameTime(g.date)}${g.gameContext ? " · " + g.gameContext : ""}`,
    isToday: isSameDay(g.date),
    dayWord: headlineDayWord(g.date),
    stake: g.seriesSummary ? prettifySeriesSummary(g.seriesSummary) : undefined,
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    href: `/game/${g.id}`,
    spoilerSubject: g.matchup,
  };
}

function wcToUpNext(g: WCGameLite, pinned: boolean, personal: boolean): UpNextItem {
  return {
    source: "wc",
    id: g.id,
    pinned,
    personal,
    eyebrow: `Summer Soccer · ${formatGameDay(g.date, new Date(), "wc")}`,
    headline: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
    detail: `${formatGameTime(g.date)}${g.stage ? " · " + g.stage : ""}`,
    isToday: isSameDay(g.date),
    dayWord: headlineDayWord(g.date),
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    // Open the match detail (which supports WC games), consistent with
    // NBA up-next. Was linking to the away country page, so tapping a
    // fixture jumped to a country instead of the game.
    href: `/game/${g.id}`,
    spoilerSubject: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
  };
}

function buildUpNext(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  pinned: PinnedGame[]
): UpNextItem[] {
  const followedTeams = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );
  const followedCountries = new Set(
    follows.filter((f) => f.kind === "country").map((f) => f.id)
  );
  const followedSeries = follows
    .filter((f) => f.kind === "series")
    .map((f) => f.id);
  // A tournament follow covers EVERY game in that tournament — following
  // "NBA Playoffs" should fill the widget without also following a team.
  // Resolve each followed tournament to its directory entry and key off
  // its accent (the sport), not a fragile id substring — renaming an id
  // (e.g. "nba-playoffs-2025" → "nba-playoffs-2026") must never silently
  // stop matching games.
  const followedTournaments = follows
    .filter((f) => f.kind === "tournament")
    .map((f) => getTournament(f.id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const followsNbaTournament = followedTournaments.some(
    (t) => t.accent === "var(--nba)"
  );
  const followsWcTournament = followedTournaments.some(
    (t) => t.accent === "var(--wc)"
  );
  const pinnedIds = new Set(pinned.map((p) => p.gameId));

  // Drop games whose kickoff has already passed while the feed still marks
  // them "upcoming" (ESPN's pre→in flip lags by a minute or two). They belong
  // in the live scoreboard, not in Upcoming reading their kickoff time — the
  // exact "live game shown as 6:00 PM upcoming" symptom (RC3/RC4). A 2-minute
  // grace absorbs clock skew without hiding a genuine pre-match.
  const KICKOFF_GRACE_MS = 2 * 60 * 1000;
  const kickoffNotPassed = (date: string) =>
    new Date(date).getTime() > Date.now() - KICKOFF_GRACE_MS;

  const nbaUpcoming = nba
    .filter((g) => g.status === "upcoming" && kickoffNotPassed(g.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const wcUpcoming = wc
    .filter((g) => g.status === "upcoming" && kickoffNotPassed(g.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // "Personal" = a game the user explicitly follows: their team, their
  // country, a series they follow (both teams in it), OR any game in a
  // tournament they follow. Tournament/series support was missing, so a
  // playoffs-only follower saw nothing surface as theirs.
  const nbaIsPersonal = (g: NBAGame): boolean => {
    if (followsNbaTournament) return true;
    if ([...followedTeams].some((abbr) => gameIncludesTeam(g, abbr))) return true;
    return followedSeries.some((sid) => {
      const [a, b] = sid.split("-");
      return !!a && !!b && gameIncludesTeam(g, a) && gameIncludesTeam(g, b);
    });
  };
  const wcIsPersonal = (g: WCGameLite): boolean => {
    if (followsWcTournament) return true;
    return [...followedCountries].some((code) => gameIncludesCountry(g, code));
  };

  // ONLY the user's followed games — never generic filler. "Follow what
  // matters, skip the rest": if you don't follow it, it doesn't surface
  // here (Today or the widget). A zero-follow user gets an empty list,
  // which the onboarding / resting states handle.
  //
  // One chronological feed across BOTH sports:
  //   1. pinned games first (explicit "this is the one I'm tracking")
  //   2. then soonest first
  // NBA and WC are merged BEFORE sorting — not "all NBA then all WC" — so
  // the next 2 weeks read in true time order. The playoff games (Jun
  // 3-10) sort ahead of the Summer Soccer openers (Jun 11) because they
  // happen first, not because of any sport priority.
  type Candidate = { date: number; pinned: boolean; item: UpNextItem };
  const candidates: Candidate[] = [];
  for (const g of nbaUpcoming) {
    if (!nbaIsPersonal(g)) continue;
    const pinned = pinnedIds.has(g.id);
    candidates.push({
      date: new Date(g.date).getTime(),
      pinned,
      item: nbaToUpNext(g, pinned, true),
    });
  }
  for (const g of wcUpcoming) {
    if (!wcIsPersonal(g)) continue;
    const pinned = pinnedIds.has(g.id);
    candidates.push({
      date: new Date(g.date).getTime(),
      pinned,
      item: wcToUpNext(g, pinned, true),
    });
  }

  candidates.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.date - b.date;
  });

  return candidates.slice(0, 5).map((c) => c.item);
}

// ── Quiet wrap ────────────────────────────────────────────────────────

/** Granular day label for the Quiet Wrap eyebrow — supports today,
 *  yesterday, and 2–N days back as weekday short names ("Sat", "Sun").
 *  formatGameDay() only handled today/tomorrow/weekday, which left the
 *  wrap reading "Yesterday" for games that were actually 2–3 days old. */
function quietWrapDayLabel(date: string, now = new Date()): string {
  const d = new Date(date);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const gameDay = new Date(d);
  gameDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - gameDay.getTime()) / 86_400_000
  );
  if (diffDays <= 0) return "Earlier";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/** Window for the Quiet Wrap — show finals from the last 3 calendar
 *  days so series that wrapped a couple nights ago are still browsable
 *  from Today instead of vanishing the moment ESPN drops them from the
 *  current-week feed. ESPN's seriesGames covers up to 14 days back, so
 *  this is purely a UI cap, not a data limit. */
const QUIET_WRAP_WINDOW_DAYS = 3;

function buildQuietWrap(
  nbaRecent: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  now = new Date()
): QuietWrapItem[] {
  const cutoffMs = now.getTime() - QUIET_WRAP_WINDOW_DAYS * 86_400_000;
  const inWindow = (date: string) => {
    const ms = new Date(date).getTime();
    return Number.isFinite(ms) && ms >= cutoffMs;
  };

  const followedTeams = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );
  const followedCountries = new Set(
    follows.filter((f) => f.kind === "country").map((f) => f.id)
  );
  // Cap is 1 (a single "discovery" row) only for a user with NO follows
  // at all, so a fresh user doesn't get an ESPN-dump of random finals.
  // Previously this keyed on NBA teams alone, which wrongly treated a
  // country-only (Summer Soccer) follower as un-followed.
  const hasAnyFollow = follows.length > 0;

  // Both sports flow into one ranked list. Quiet Wrap was NBA-only until
  // now — Summer Soccer finals never reached it because the function
  // never received the WC feed. `personal` (a followed team/country is in
  // the match) floats to the top; within a tier the most recent comes
  // first, so a soccer final from today can sit above last night's NBA.
  type Entry =
    | { source: "nba"; ms: number; personal: boolean; g: NBAGame }
    | { source: "wc"; ms: number; personal: boolean; g: WCGameLite };

  const nbaEntries: Entry[] = nbaRecent
    .filter((g) => g.status === "final" && inWindow(g.date))
    .map((g) => ({
      source: "nba",
      ms: new Date(g.date).getTime(),
      personal: [...followedTeams].some((abbr) => gameIncludesTeam(g, abbr)),
      g,
    }));

  const wcEntries: Entry[] = wc
    .filter((g) => g.status === "final" && inWindow(g.date))
    .map((g) => ({
      source: "wc",
      ms: new Date(g.date).getTime(),
      personal: [...followedCountries].some((c) => gameIncludesCountry(g, c)),
      g,
    }));

  const ranked = [...nbaEntries, ...wcEntries].sort((a, b) =>
    a.personal !== b.personal ? (a.personal ? -1 : 1) : b.ms - a.ms
  );

  const cap = hasAnyFollow ? 3 : 1;

  return ranked.slice(0, cap).map<QuietWrapItem>((e) => {
    const dayLabel = quietWrapDayLabel(e.g.date, now);
    // Use "vs" to match the Up Next + game-detail pattern. The Quiet
    // Wrap card is a final-score line, not a series label.
    const matchup = `${e.g.away.abbreviation} vs ${e.g.home.abbreviation}`;
    const scoreLine = `${e.g.away.score} – ${e.g.home.score}`;

    if (e.source === "wc") {
      return {
        source: "wc",
        id: e.g.id,
        eyebrow: dayLabel,
        matchup,
        scoreLine,
        // Soccer's calm end-state word, mirroring WCGameDetail.
        context: "Full time.",
        spoilerSubject: matchup,
        kind: "final",
        href: `/game/${e.g.id}`,
      };
    }

    const g = e.g;
    // Pull "Game N" out of the API gameContext when present. Lets two
    // finals of the same series (e.g. NY · CLE Game 3 and NY · CLE Game 4)
    // visually disambiguate in the wrap list.
    const gameNumberMatch = g.gameContext?.match(/Game\s+(\d)/i);
    const gameNumberLabel = gameNumberMatch ? `Game ${gameNumberMatch[1]}` : null;
    const eyebrow = gameNumberLabel
      ? `${dayLabel} · ${gameNumberLabel}`
      : dayLabel;

    // Calm prose only — the score already carries the result. Avoid
    // winner-revealing verbs even when No-Spoilers is off. "Final." is the
    // calmest acknowledgement that the game ended.
    const isSeriesClinch = /WINS\s+SERIES/i.test(g.seriesSummary);

    return {
      source: "nba",
      id: g.id,
      eyebrow,
      matchup,
      scoreLine,
      context: "Final.",
      spoilerSubject: g.matchup,
      kind: isSeriesClinch ? "series" : "final",
      href: `/game/${g.id}`,
    };
  });
}

// ── Reminder ──────────────────────────────────────────────────────────

function buildReminder(follows: Follow[], now = new Date()): ReminderRow | null {
  const days = daysUntil(WC_KICKOFF, now);
  if (days <= 0 || days > 90) return null;

  const dayWord = `${days} day${days === 1 ? "" : "s"}`;

  const country = follows.find((f) => f.kind === "country");
  if (country) {
    // Lead with the Summer Soccer (cleaner + grammatical — "United States
    // kick off" read awkwardly), and carry the followed country in the
    // secondary detail line so it still feels personal. The human
    // country name, not the ESPN/FIFA code (per the voice rule). Falls
    // back to the code if the directory doesn't recognize it.
    const entry = getCountry(country.id);
    const name = entry?.name ?? country.id;
    const detail = entry ? `${name} · Group ${entry.group}` : name;
    return {
      text: `Summer Soccer kicks off in ${dayWord}.`,
      detail,
      href: `/country/${country.id}`,
    };
  }

  return {
    text: `Summer Soccer kicks off in ${dayWord}.`,
    detail: "Pick a country in Following to make this personal.",
    href: "/following",
  };
}

// ── Closing moment ────────────────────────────────────────────────────
// Detect a single "calm ending" the Today screen should surface. Two
// shapes, one card:
//
//   • Series wrapped — a playoff series the user follows (directly via
//     a series follow, or indirectly via following one of the teams)
//     ended within the last ~3 days. Includes a per-game dot strip.
//   • Tournament wrapped — the NBA Finals ended within the last ~7 days
//     AND the user has no active live/upcoming content. Acknowledges
//     the off-season honestly. No CTA.
//
// Series takes priority. Only one closing moment renders at a time.

const SERIES_CLOSE_WINDOW_DAYS = 3;
const TOURNAMENT_CLOSE_WINDOW_DAYS = 7;

/** Parse "OKC WINS SERIES 4-2" / "Cleveland wins series 4-1" patterns
 *  out of the API's seriesSummary. Returns the winner abbreviation and
 *  the series margin (high-low). Null when the line doesn't indicate a
 *  series clinch. */
function parseSeriesClinch(
  summary: string,
  game: NBAGame
): { winnerCode: string; high: number; low: number } | null {
  if (!summary) return null;
  // Common shapes: "OKC WINS SERIES 4-2", "Oklahoma City wins series 4-2",
  // sometimes uppercase, sometimes title-case. Accept both.
  const m = summary.match(/([A-Z]{2,4}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+wins?\s+series\s+(\d)\s*[–-]\s*(\d)/i);
  if (!m) return null;
  const high = Number(m[2]);
  const low = Number(m[3]);
  if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
  // Resolve the matched token against THIS game's real teams — never fabricate
  // a code by slicing a city name ("Oklahoma City" → "OKL"). Match on the real
  // abbreviation or name, case-insensitive; no match → not a usable clinch.
  const token = m[1].trim().toLowerCase();
  const matches = (t: { name: string; abbreviation: string }) =>
    t.abbreviation.toLowerCase() === token ||
    t.name.toLowerCase() === token ||
    t.name.toLowerCase().includes(token) ||
    token.includes(t.abbreviation.toLowerCase());
  const winner = matches(game.away)
    ? game.away
    : matches(game.home)
      ? game.home
      : null;
  if (!winner) return null;
  return { winnerCode: winner.abbreviation, high, low };
}

/** Pull all games belonging to a series (sorted-abbr key, e.g.
 *  "CLE-NYK") out of the given list, sorted by date. */
function gamesInSeries(games: NBAGame[], seriesKey: string): NBAGame[] {
  const [a, b] = seriesKey.split("-");
  if (!a || !b) return [];
  return games
    .filter(
      (g) =>
        (g.away.abbreviation === a && g.home.abbreviation === b) ||
        (g.away.abbreviation === b && g.home.abbreviation === a)
    )
    .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
}

function followedSeriesKeys(follows: Follow[]): Set<string> {
  const out = new Set<string>();
  for (const f of follows) {
    if (f.kind === "series") {
      // Normalize to sorted-abbr key so a "NYK-CLE" follow matches a
      // "CLE-NYK" series.
      out.add(f.id.split("-").sort().join("-"));
    }
  }
  return out;
}

function followedTeamIds(follows: Follow[]): Set<string> {
  const out = new Set<string>();
  for (const f of follows) {
    if (f.kind === "team") out.add(f.id);
  }
  return out;
}

/** Turn a Follow into a chip {label, href} for the CalmEndCard's
 *  "still in your circle" list. Labels lean on the existing data
 *  helpers (country / tournament names); teams + series fall back to
 *  their codes, which is what the rest of the app shows in chips. */
function followToCircleItem(f: Follow): ClosingCircleItem {
  switch (f.kind) {
    case "country": {
      const country = getCountry(f.id);
      return {
        key: `country:${f.id}`,
        label: country?.name ?? f.id,
        href: `/country/${f.id}`,
      };
    }
    case "tournament": {
      const t = getTournament(f.id);
      return {
        key: `tournament:${f.id}`,
        label: t?.name ?? f.id,
        href: `/tournament/${f.id}`,
      };
    }
    case "series":
      return {
        key: `series:${f.id}`,
        label: f.id.replace("-", " vs "),
        href: `/series/${f.id}`,
      };
    case "team":
    default:
      return {
        key: `team:${f.id}`,
        label: f.id,
        href: `/team/${f.id}`,
      };
  }
}

/** Build the "still in your circle" list from the user's follows,
 *  excluding any follow keys in `exclude` (e.g. the wrapped series and
 *  the eliminated team the card is already about). Caps at 4 so the
 *  card stays calm. Returns [] when there's nothing left to show. */
function buildCircle(follows: Follow[], exclude: Set<string>): ClosingCircleItem[] {
  const items: ClosingCircleItem[] = [];
  const seen = new Set<string>();
  for (const f of follows) {
    const item = followToCircleItem(f);
    if (exclude.has(item.key) || seen.has(item.key)) continue;
    seen.add(item.key);
    items.push(item);
    if (items.length >= 4) break;
  }
  return items;
}

function buildClosingDots(seriesGames: NBAGame[]): ClosingMomentDot[] {
  return seriesGames
    .filter((g) => g.status === "final")
    .map<ClosingMomentDot>((g, idx) => {
      const homeWon = g.home.score > g.away.score;
      return {
        number: idx + 1,
        awayCode: g.away.abbreviation,
        homeCode: g.home.abbreviation,
        winnerCode: homeWon ? g.home.abbreviation : g.away.abbreviation,
      };
    });
}

function pickClosing(
  nbaRecent: NBAGame[],
  follows: Follow[],
  hasLive: boolean,
  hasUpcoming: boolean,
  now = new Date()
): ClosingMoment | null {
  const seriesWindowMs = now.getTime() - SERIES_CLOSE_WINDOW_DAYS * 86_400_000;
  const tournamentWindowMs =
    now.getTime() - TOURNAMENT_CLOSE_WINDOW_DAYS * 86_400_000;

  const followedSeries = followedSeriesKeys(follows);
  const followedTeams = followedTeamIds(follows);

  // ── Series variant ──
  // Find any final game whose seriesSummary indicates a clinch, within
  // the last SERIES_CLOSE_WINDOW_DAYS, that the user follows (either by
  // series id OR by following a team in it). Pick the most recent.
  const clinches = nbaRecent
    .filter((g) => {
      if (g.status !== "final") return false;
      const gameMs = new Date(g.date).getTime();
      if (!Number.isFinite(gameMs) || gameMs < seriesWindowMs) return false;
      return parseSeriesClinch(g.seriesSummary, g) !== null;
    })
    .map((g) => {
      const seriesKey = [g.away.abbreviation, g.home.abbreviation]
        .sort()
        .join("-");
      const clinch = parseSeriesClinch(g.seriesSummary, g)!;
      return { g, seriesKey, clinch };
    })
    // Followed (by series OR by team in the series) only.
    .filter(({ g, seriesKey }) => {
      if (followedSeries.has(seriesKey)) return true;
      if (followedTeams.has(g.away.abbreviation)) return true;
      if (followedTeams.has(g.home.abbreviation)) return true;
      return false;
    })
    // Most recent clinch first.
    .sort((a, b) => new Date(b.g.date).getTime() - new Date(a.g.date).getTime());

  if (clinches.length > 0) {
    const { g, seriesKey, clinch } = clinches[0];
    const seriesGames = gamesInSeries(nbaRecent, seriesKey);
    const dots = buildClosingDots(seriesGames);
    const totalGames = clinch.high + clinch.low;

    // CTA: suggest following the winner if the user doesn't already.
    const winnerCode = clinch.winnerCode;
    const userFollowsWinner = followedTeams.has(winnerCode);
    const followSuggestion = userFollowsWinner
      ? undefined
      : { kind: "team" as const, id: winnerCode, label: winnerCode };

    // Series-closure redirect (Phase 21C). When the user followed the
    // LOSING team — the one that just got eliminated — surface their
    // other follows so the emotional investment has somewhere to go.
    // We exclude the wrapped series and the eliminated team itself.
    const loserCode =
      winnerCode === g.away.abbreviation
        ? g.home.abbreviation
        : g.away.abbreviation;
    const userFollowsLoser = followedTeams.has(loserCode);
    const circle = userFollowsLoser
      ? buildCircle(
          follows,
          new Set([`team:${loserCode}`, `series:${seriesKey}`]),
        )
      : [];

    const nextRoundHint =
      g.seriesRound === "NBA Finals"
        ? "Season wrapped."
        : g.seriesRound === "Conf Finals"
          ? "Finals are next."
          : g.seriesRound === "Second Round"
            ? "Conference Finals are next."
            : g.seriesRound === "First Round"
              ? "Second round is next."
              : undefined;

    return {
      id: `series:${seriesKey}`,
      kind: "series",
      eyebrow: "Series wrapped",
      headline: `${g.away.abbreviation} · ${g.home.abbreviation}`,
      detail:
        nextRoundHint
          ? `${totalGames} games. ${nextRoundHint}`
          : `${totalGames} games.`,
      dots,
      spoilerSummary: `${winnerCode} took it in ${totalGames}.`,
      followSuggestion,
      primary: followSuggestion
        ? { label: `Follow ${followSuggestion.label}`, href: "/following" }
        : undefined,
      circleHeading: circle.length > 0 ? "Still in your circle" : undefined,
      circle: circle.length > 0 ? circle : undefined,
      // Auto-drop the dead series follow (only if they follow the
      // SERIES; team follows are left alone so they can ride into the
      // next round). Frees the alert slot the moment the series wraps.
      autoDropFollow: followedSeries.has(seriesKey)
        ? { kind: "series", id: seriesKey }
        : undefined,
      autoDropNote: followedSeries.has(seriesKey)
        ? "We retired your follow on this series to free an alert slot. Your other follows are untouched."
        : undefined,
    };
  }

  // ── Tournament variant (NBA Finals wind-down) ──
  // Show only when:
  //   • An "NBA Finals" series clinched within the last
  //     TOURNAMENT_CLOSE_WINDOW_DAYS.
  //   • Nothing live or upcoming on Today.
  // No CTA. No upsell. Acknowledgment only.
  if (!hasLive && !hasUpcoming) {
    const finalsClinch = nbaRecent
      .filter((g) => {
        if (g.status !== "final") return false;
        if (g.seriesRound !== "NBA Finals") return false;
        const gameMs = new Date(g.date).getTime();
        if (!Number.isFinite(gameMs) || gameMs < tournamentWindowMs) return false;
        return parseSeriesClinch(g.seriesSummary, g) !== null;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (finalsClinch) {
      // Year stamp for stable dismiss id across multiple seasons.
      const year = new Date(finalsClinch.date).getFullYear();
      return {
        id: `tournament:nba-${year}`,
        kind: "tournament",
        eyebrow: "Season wrapped",
        headline: "The playoffs are over.",
        detail: "We'll be back when the next moment matters.",
        dots: [],
      };
    }

    // ── Dead-zone bridge (Phase 21C) ──
    // The slate is quiet (nothing live or upcoming) and there was no
    // recent Finals clinch to acknowledge — a genuine off-moment lull.
    // Only surface when the user actually follows something, so the
    // card has a circle to point back to. Lists their follows as chips
    // and names the next moment on the calendar so the quiet feels
    // intentional, not abandoned. Dismiss id is day-stamped so it can
    // resurface on a later quiet day without nagging within one day.
    if (follows.length > 0) {
      const circle = buildCircle(follows, new Set());
      if (circle.length > 0) {
        // Local YYYY-MM-DD, not UTC: a UTC day rolls over hours before local
        // midnight, so an evening dismissal in the Americas re-appeared the
        // same night. QuietRecap already keys on the local date — match it.
        const dayStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        return {
          id: `deadzone:${dayStamp}`,
          kind: "deadzone",
          eyebrow: "Quiet stretch",
          headline: "Your circle is quiet right now.",
          // NFL is the next scheduled moment in the product (Sept).
          // Phrase softly — no exact date we'd have to keep accurate.
          detail: "Nothing live or coming up. NFL kicks off in September.",
          dots: [],
          circleHeading: "You still follow",
          circle,
        };
      }
    }
  }

  return null;
}

// ── Pinned summary ────────────────────────────────────────────────────
// Resolve each pinned game ID against the current-week NBA feed, the
// recent-games (seriesGames) feed, and the WC feed. Bucket each pin
// by its actual game.status, count them, and pick a "primary" for the
// brief CTA.
//
// Resolution order matters:
//   • nba (current week, freshest scores)
//   • nbaRecent (seriesGames, covers ~14 days back)
//   • wc
//   • unresolved (none of the above — could still be snapshot-resolvable
//     on Watching, but the brief treats them as unavailable)
//
// Within a single status bucket, "primary" prefers the newest pin —
// most recent intent reads as the user's current focus.
//
// Priority across buckets (for primary selection):
//   live > upcoming > final > unresolved
// This matches the daily brief's headline priority — a user with one
// live + one wrapped pin most wants to see the live one.

function buildPinnedSummary(
  nba: NBAGame[],
  nbaRecent: NBAGame[],
  wc: WCGameLite[],
  pinned: PinnedGame[]
): PinnedSummary {
  if (pinned.length === 0) {
    return {
      total: 0,
      live: 0,
      upcoming: 0,
      final: 0,
      unresolved: 0,
      primary: null,
    };
  }

  // Build lookup maps once. NBA first (fresher) so duplicate IDs
  // between feeds prefer the current-week version.
  const nbaById = new Map<string, NBAGame>();
  for (const g of nbaRecent) nbaById.set(g.id, g);
  for (const g of nba) nbaById.set(g.id, g);
  const wcById = new Map(wc.map((g) => [g.id, g]));

  type Resolved = {
    gameId: string;
    pinnedAt: number;
    status: PinnedStatusBucket;
  };

  const resolved: Resolved[] = [];

  for (const pin of pinned) {
    const nbaGame = nbaById.get(pin.gameId);
    if (nbaGame) {
      resolved.push({
        gameId: pin.gameId,
        pinnedAt: pin.pinnedAt,
        // game.status is already "live" | "upcoming" | "final" — same
        // shape as PinnedStatusBucket minus "unresolved", so the cast
        // is safe.
        status: nbaGame.status,
      });
      continue;
    }
    const wcGame = wcById.get(pin.gameId);
    if (wcGame) {
      resolved.push({
        gameId: pin.gameId,
        pinnedAt: pin.pinnedAt,
        status: wcGame.status,
      });
      continue;
    }
    resolved.push({
      gameId: pin.gameId,
      pinnedAt: pin.pinnedAt,
      status: "unresolved",
    });
  }

  const live = resolved.filter((r) => r.status === "live").length;
  const upcoming = resolved.filter((r) => r.status === "upcoming").length;
  const final = resolved.filter((r) => r.status === "final").length;
  const unresolved = resolved.filter((r) => r.status === "unresolved").length;

  // Primary pick: walk priority order, return the newest pin in the
  // highest-priority bucket that has members.
  const priority: PinnedStatusBucket[] = [
    "live",
    "upcoming",
    "final",
    "unresolved",
  ];
  let primary: PinnedSummary["primary"] = null;
  for (const bucket of priority) {
    const inBucket = resolved
      .filter((r) => r.status === bucket)
      .sort((a, b) => b.pinnedAt - a.pinnedAt);
    if (inBucket.length > 0) {
      const top = inBucket[0];
      primary = {
        gameId: top.gameId,
        status: top.status,
        href:
          top.status === "unresolved"
            ? "/watching"
            : `/game/${top.gameId}`,
      };
      break;
    }
  }

  return {
    total: pinned.length,
    live,
    upcoming,
    final,
    unresolved,
    primary,
  };
}

// ── Top-level builder ─────────────────────────────────────────────────

// The desktop scoreboard: the user's followed games that are live now or
// coming today, score-forward. Live tiles come from the raw feeds (real
// scores); upcoming-today tiles reuse the already-built Up Next list.
// "Followed" = pinned, a team/country in the game, or a covering tournament.
function buildScoreboard(
  nba: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  pinned: PinnedGame[]
): ScoreboardTile[] {
  const pinnedIds = new Set(pinned.map((p) => p.gameId));
  const codes = new Set<string>();
  let wcTour = false;
  let nbaTour = false;
  for (const f of follows) {
    if (f.kind === "team" || f.kind === "country") codes.add(f.id.toUpperCase());
    else if (f.kind === "series")
      f.id.split("-").forEach((c) => codes.add(c.toUpperCase()));
    else if (f.kind === "tournament") {
      if (getTournament(f.id)?.accent === "var(--wc)") wcTour = true;
      else nbaTour = true;
    }
  }
  const covered = (away: string, home: string, sport: "nba" | "wc", id: string) =>
    pinnedIds.has(id) ||
    (sport === "wc" ? wcTour : nbaTour) ||
    codes.has(away.toUpperCase()) ||
    codes.has(home.toUpperCase());
  const leadOf = (a: number, h: number): "away" | "home" | null =>
    a > h ? "away" : h > a ? "home" : null;

  const tiles: ScoreboardTile[] = [];

  for (const g of nba) {
    if (g.status !== "live") continue;
    if (!covered(g.away.abbreviation, g.home.abbreviation, "nba", g.id)) continue;
    tiles.push({
      id: g.id,
      source: "nba",
      awayCode: g.away.abbreviation,
      homeCode: g.home.abbreviation,
      awayScore: g.away.score,
      homeScore: g.home.score,
      status: "live",
      statusLine: g.statusText || "Live",
      stageLine: g.gameContext ? `NBA · ${g.gameContext}` : "NBA",
      href: `/game/${g.id}`,
      lead: leadOf(g.away.score, g.home.score),
    });
  }
  for (const g of wc) {
    if (g.status !== "live") continue;
    if (!covered(g.away.abbreviation, g.home.abbreviation, "wc", g.id)) continue;
    tiles.push({
      id: g.id,
      source: "wc",
      awayCode: g.away.abbreviation,
      homeCode: g.home.abbreviation,
      awayScore: g.away.score,
      homeScore: g.home.score,
      status: "live",
      statusLine: g.statusText || "Live",
      stageLine: g.stage ? `Summer Soccer · ${g.stage}` : "Summer Soccer",
      href: `/game/${g.id}`,
      lead: leadOf(g.away.score, g.home.score),
    });
  }
  // Live games only. Upcoming games live in the Up Next list (time-forward,
  // with channels) — surfacing them here too produced a redundant grid of
  // score-less "—" tiles duplicating that list, especially for a tournament
  // follower whose whole slate is "personal".
  return tiles.slice(0, 12);
}

export function buildTodayPayload({
  nba,
  nbaRecent,
  wc,
  follows,
  pinned,
  now = new Date(),
}: {
  /** Current-week NBA games used for hero, You Follow chips, and
   *  Up Next. */
  nba: NBAGame[];
  /** Wider window of recent NBA games (last ~14 days). Used by Quiet
   *  Wrap so games that wrapped 2–3 days ago stay browsable from
   *  Today. Falls back to `nba` when the API doesn't surface
   *  seriesGames (older deploy / failure). */
  nbaRecent?: NBAGame[];
  wc: WCGameLite[];
  follows: Follow[];
  pinned: PinnedGame[];
  now?: Date;
}): TodayPayload {
  const recentForWrap = nbaRecent && nbaRecent.length > 0 ? nbaRecent : nba;
  const hero = pickHero(nba, wc, follows, pinned, now);
  const youFollow = buildYouFollow(nba, wc, follows, now);
  // Up Next uses the WIDER window (seriesGames, ~2 weeks ahead), not the
  // current calendar week. The full playoff slate runs past this week
  // (e.g. Games 3-4 land next week), and they must appear before the
  // Summer Soccer openers. buildUpNext filters to status==="upcoming", so the
  // wider window's past finals are dropped — only the forward games stay.
  const upNext = buildUpNext(recentForWrap, wc, follows, pinned);
  const quietWrap = buildQuietWrap(recentForWrap, wc, follows, now);
  const reminder = buildReminder(follows, now);

  const hasLive = nba.some((g) => g.status === "live") || wc.some((g) => g.status === "live");
  const hasUpcoming = upNext.length > 0;
  // A personal game scheduled for *tonight* (same calendar day as now)
  // counts as live-stakes context, even if tipoff hasn't happened yet.
  // Without this gate, the Today headline drops to "Quiet for now."
  // while a followed team's game is hours away — which is the exact
  // moment the page should feel most anticipatory. Reported from a
  // real-world session: NYK vs SA was listed in NEXT UP with the
  // "TONIGHT" eyebrow, and the headline still said "Quiet for now."
  const hasTonightUpcoming = upNext.some((item) => item.isToday);
  const closing = pickClosing(recentForWrap, follows, hasLive, hasUpcoming, now);
  const pinnedSummary = buildPinnedSummary(nba, recentForWrap, wc, pinned);
  // Quiet Wrap intentionally shows both today's "Earlier" finals AND
  // yesterday's finals for context, but the Quiet Recap moment is
  // strictly about *tonight's* slate. Count only games that finished
  // today (local time), via formatGameDay's "Tonight" branch.
  // Use recentForWrap, not nba: ESPN drops finals from the current-week feed a
  // few hours after they end, so a late-night opener — the exact moment the
  // once-per-night recap exists for — would silently never fire. Quiet Wrap
  // already reads recentForWrap, so this keeps the two in agreement.
  const tonightFinals = recentForWrap.filter(
    (g) => g.status === "final" && formatGameDay(g.date, now) === "Tonight"
  );
  const hasTonightFinals = tonightFinals.length > 0;
  const hasFinals = quietWrap.length > 0;
  const isQuietDay = !hasLive && !hasUpcoming && !hasFinals;
  // Resting state (design C): nothing live right now, no game tonight,
  // but games are coming up later in the week and there's nothing
  // just-wrapped to recap. Distinct from isQuietDay (the true
  // nothing-at-all dead zone). Suppressed when a calm-ending card is
  // showing, since that moment owns the screen. Also suppressed by
  // hasTonightUpcoming so a followed team's game tonight flips Today
  // into the FrontPageLead path ("One game tonight.") instead of
  // "Quiet for now."
  const restingState =
    !hasLive && hasUpcoming && !hasTonightUpcoming && !hasFinals && !closing;
  // Slate complete: nothing live, nothing upcoming, but at least one
  // game finished tonight. Yesterday's finals don't trigger the recap.
  const slateComplete = !hasLive && !hasUpcoming && hasTonightFinals;
  const finalsCount = slateComplete ? tonightFinals.length : 0;

  return {
    hero,
    youFollow,
    upNext,
    quietWrap,
    reminder,
    isQuietDay,
    restingState,
    slateComplete,
    finalsCount,
    closing,
    pinnedSummary,
    knockoutMoments: buildKnockoutMoments(wc, follows),
    scoreboard: buildScoreboard(nba, wc, follows, pinned),
  };
}

// Knockout advancement / elimination moments for the user's followed
// countries. Single-elimination, so a finished knockout match decides the
// followed country's fate; countryKnockoutOutcome computes it from the
// real score (penalty-aware) and never guesses. The live WC feed is a
// rolling window, so any final here is recent — no extra date windowing.
export function buildKnockoutMoments(
  wc: WCGameLite[],
  follows: Follow[]
): KnockoutMomentItem[] {
  const followed = new Set(
    follows.filter((f) => f.kind === "country").map((f) => f.id)
  );
  if (followed.size === 0) return [];

  // Most recent decided knockout match per followed country.
  const latest = new Map<
    string,
    { game: WCGameLite; outcome: "advanced" | "eliminated" }
  >();
  for (const g of wc) {
    if (g.status !== "final") continue;
    for (const code of followed) {
      if (g.home.abbreviation !== code && g.away.abbreviation !== code) continue;
      const outcome = countryKnockoutOutcome(g, code);
      if (!outcome) continue;
      const prev = latest.get(code);
      if (!prev || g.date > prev.game.date) latest.set(code, { game: g, outcome });
    }
  }

  const items: KnockoutMomentItem[] = [];
  for (const [code, { game, outcome }] of latest) {
    const r = knockoutResult(game);
    if (!r) continue;
    const next = nextStageLabel(r.stageKey);
    items.push({
      id: `ko:${game.id}:${code}`,
      countryCode: code,
      countryName: getCountry(code)?.name ?? code,
      outcome,
      stageLabel: game.stage,
      nextStage: outcome === "advanced" ? next : "",
      isChampion: outcome === "advanced" && r.stageKey === "final",
      scoreLine: `${game.away.abbreviation} ${game.away.score} – ${game.home.abbreviation} ${game.home.score}`,
      href: `/country/${code}`,
    });
  }
  return items;
}

// ── Front Page headline (Concept A) ────────────────────────────────────
// The editorial lead of Today: a short, declarative headline ("One game
// tonight." energy) + an accent eyebrow + a single condensed "deck" card
// for the lead game. Distinct from the conversational Daily Brief — that
// sentence reads fine small but weird blown up, so the headline is its
// own punchy copy and the brief is no longer the hero.

export type TodayHeadlineDeck = {
  /** Matchup string, e.g. "OKC vs SA". View splits on " vs " into chips. */
  matchup: string;
  /** Time / status line, e.g. "8:30 PM · Game 6" or a live status. */
  detail: string;
  /** Broadcast channel, e.g. "NBC". */
  broadcast?: string;
  accent: "var(--nba)" | "var(--wc)";
  href: string;
};

export type TodayHeadline = {
  eyebrow: { label: string; tone: "nba" | "wc" | "mute" };
  headline: string;
  /** Optional support line under the deck (a stake, when we have one). */
  support?: string;
  /** The single lead game as a deck card. Null on quiet / countdown days. */
  deck: TodayHeadlineDeck | null;
  /** True when the lead is a live game. Drives the pulsing dot on the
   *  Front Page deck so the user instantly sees something is happening. */
  live: boolean;
};

const HEADLINE_NUM = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];
function spellCount(n: number): string {
  return n >= 1 && n <= 9 ? HEADLINE_NUM[n] : String(n);
}

/** The single lead game for the Front Page: a deck card plus its series
 *  stake (when one exists). Deck and stake always describe the SAME game
 *  so the support line can't drift from the card above it. */
type LeadGame = { deck: TodayHeadlineDeck; stake?: string };

/** Build the lead game from the live hero (preferred), then the first
 *  up-next item, then any non-countdown hero. Returns null for non-game
 *  leads (WC countdown, quiet day). */
function leadGame(payload: TodayPayload): LeadGame | null {
  const hero = payload.hero;

  // Live takes precedence — there is no up-next while a game is on.
  // The deck's detail line is the live status ("Third quarter
  // underway."), leaving the series record to the stake support line.
  if (hero?.live && hero.kind !== "wc-countdown") {
    return {
      deck: {
        matchup: hero.spoilerMatchup ?? hero.headline,
        detail: hero.headline,
        broadcast: hero.watch?.channel,
        accent: hero.accent,
        href: hero.href,
      },
      stake: hero.stake,
    };
  }

  // Upcoming — the up-next item already carries the "time · context"
  // detail ("8:30 PM · Game 6") and the broadcast the deck wants.
  const up = payload.upNext[0];
  if (up) {
    return {
      deck: {
        matchup: up.headline,
        detail: up.detail,
        broadcast: up.watch?.channel,
        accent: up.source === "wc" ? "var(--wc)" : "var(--nba)",
        href: up.href,
      },
      stake: up.stake,
    };
  }

  // Fallback: a non-live, non-countdown hero with no up-next backing.
  if (hero && hero.kind !== "wc-countdown") {
    return {
      deck: {
        matchup: hero.spoilerMatchup ?? hero.headline,
        detail: hero.context ?? "",
        broadcast: hero.watch?.channel,
        accent: hero.accent,
        href: hero.href,
      },
      stake: hero.stake,
    };
  }

  return null;
}

// NBA playoff games are evening events → "tonight"; Summer Soccer games
// skew daytime → "today". The headline is about the day you care about,
// not a generic "up next" — the eyebrow carries the live/upcoming state.
function whenWord(tone: "nba" | "wc"): string {
  return tone === "wc" ? "today" : "tonight";
}

// Plural form — "matches" / "games". "match" pluralizes with -es, so a
// blunt `${noun}s` produced the "matchs" typo.
function sportNounPlural(tone: "nba" | "wc"): string {
  return tone === "wc" ? "matches" : "games";
}

// "AUT vs ARG" -> "Austria vs Argentina" for the lead headline. Resolves
// country codes to names (Summer Soccer); NBA codes pass through (no name
// table, and not the live season). Spoiler-safe — it names the fixture,
// never a score, so it's the same exposure as the deck below it.
function editorialMatchup(matchup: string, tone: "nba" | "wc"): string {
  if (tone !== "wc") return matchup;
  const parts = matchup.split(/\s+vs\s+/i);
  if (parts.length !== 2) return matchup;
  const [a, b] = parts.map(
    (p) => getCountry(p.trim().toUpperCase())?.name ?? p.trim()
  );
  return `${a} vs ${b}`;
}

export function deriveTodayHeadline(payload: TodayPayload): TodayHeadline {
  const lead = leadGame(payload);
  const deck = lead?.deck ?? null;
  const heroLive = payload.hero?.live === true;
  const heroTone: "nba" | "wc" =
    payload.hero?.accent === "var(--wc)" ? "wc" : "nba";

  // Live takes the lead. The headline counts LIVE games and says so, to
  // match the "Live now" eyebrow — saying "One game today" while the
  // Upcoming list below shows several more reads as a contradiction. The
  // count is the live slate (pinned-live / live hero), not the day's slate.
  if (heroLive || payload.pinnedSummary.live > 0) {
    const lc = Math.max(payload.pinnedSummary.live, heroLive ? 1 : 0, 1);
    return {
      eyebrow: { label: "Live now", tone: heroTone },
      // One live game leads with the matchup itself (the eyebrow + pulse
      // already say it's live); several fall back to the live count.
      headline:
        lc === 1 && deck
          ? `${editorialMatchup(deck.matchup, heroTone)}.`
          : `${spellCount(lc)} ${sportNounPlural(heroTone)} live.`,
      // Support line: a series stake ("OKC leads series 3-2") when the
      // lead is a playoff game, else the hero's context line. For a busy
      // Summer Soccer slate that context is "N Summer Soccer matches live now." —
      // so the user sees the wider slate even though the deck shows one.
      support: lead?.stake ?? payload.hero?.context,
      deck,
      live: true,
    };
  }

  // Upcoming games on the slate. The headline counts the games on the
  // LEAD day only — today's games when any are on today, otherwise the
  // soonest upcoming day. A future "Game 7 if necessary" shouldn't make
  // "One game tonight." read "Two games tonight."
  if (payload.upNext.length > 0) {
    const todayItems = payload.upNext.filter((u) => u.isToday);

    if (todayItems.length > 0) {
      const n = todayItems.length;
      const tone: "nba" | "wc" = todayItems[0].source === "wc" ? "wc" : "nba";
      const when = whenWord(tone);
      return {
        eyebrow: { label: "Up next", tone },
        // One game on the slate leads with the matchup; several keep the
        // count so the headline stays honest about the day's shape.
        headline:
          n === 1 && deck
            ? `${editorialMatchup(deck.matchup, tone)} ${when}.`
            : `${spellCount(n)} ${sportNounPlural(tone)} ${when}.`,
        support: lead?.stake,
        deck,
        live: false,
      };
    }

    // Nothing on today — lead with the soonest upcoming day and count
    // only the games that share it ("One match Saturday.").
    const lead0 = payload.upNext[0];
    const day = lead0.dayWord;
    const n = payload.upNext.filter((u) => u.dayWord === day).length;
    const tone: "nba" | "wc" = lead0.source === "wc" ? "wc" : "nba";
    return {
      eyebrow: { label: "Up next", tone },
      headline:
        n === 1 && deck
          ? `${editorialMatchup(deck.matchup, tone)} ${day}.`
          : `${spellCount(n)} ${sportNounPlural(tone)} ${day}.`,
      support: lead?.stake,
      deck,
      live: false,
    };
  }

  // Nothing live or upcoming. Calm — the Summer Soccer countdown and any
  // wrapped recap render as their own quieter stories below.
  return {
    eyebrow: { label: "Today", tone: "mute" },
    headline: payload.reminder ? "Quiet for now." : "All quiet.",
    deck: null,
    live: false,
  };
}

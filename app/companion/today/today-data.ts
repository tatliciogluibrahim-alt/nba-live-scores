// Today data layer — pure adapters. Input: the existing API responses we
// already ship. Output: a single TodayPayload tuned for the Today composition.
// Keep all "what to surface" logic here so the screen file stays a layout.

import type { Follow, PinnedGame, AlertPreset, Sport } from "../state/types";
import type { WCChampion } from "../../lib/wc-champion";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import { momentSport, teamFollowCodes } from "../state/moments";
import { NFL_2026_SEASON_OPENER, nflWeekLabel } from "../following/data/nfl-dates";
import { getCountry } from "../following/data/countries";
import { getNFLTeam } from "../following/data/nfl-teams";
import { getTournament } from "../following/data/tournaments";
import { tournamentPhase } from "../following/data/tournament-phase";
import {
  buildNBAFollowCoverage,
  nbaGameMatchesFollowCoverage,
} from "../following/nba-follow-coverage";
import { prettifySeriesSummary } from "../../nba/lib/series";
import { withGameOrigin } from "../game/game-origin";
import {
  countryKnockoutOutcome,
  isRealCountryCode,
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
  | "nfl-live"
  | "nba-upcoming"
  | "wc-countdown"
  | null;

/** Accent token for a sport-tinted surface (hero, deck, eyebrow). One
 *  union so a new sport can't be half-threaded: widening it here makes
 *  every consumer branch fail to compile until it handles the new case. */
export type TodayAccent = "var(--nba)" | "var(--wc)" | "var(--nfl)";

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
  accent: TodayAccent;
  /** True when this hero is being surfaced because the user pinned the game. */
  pinned?: boolean;
  /** When the live hero is a team/country you follow, the followed subject's
   *  name ("United States", "Knicks"). Lets the headline lead personally
   *  ("United States are live.") instead of naming the raw matchup. */
  subject?: string;
  /** How many games you follow are live right now (across both sports).
   *  Drives the "Two of yours are live." headline. */
  followedLiveCount?: number;
  /** Where tapping the hero goes (Stage 1 placeholder routes for now). */
  href: string;
  /** When set, the No-Spoilers variant uses this matchup string. */
  spoilerMatchup?: string;
  spoilerKind?: "live" | "final" | "series";
  spoilerSubject?: string;
  watch?: { channel: string; stream?: string };
  /** Raw display facts of the hero's game for the System D monument
   *  (codes, names, scores, parseable clock). Unset for the countdown
   *  hero (no game behind it). */
  game?: TodayLeadGame;
};

export type YouFollowItem = {
  kind: Follow["kind"];
  /** Sport of the underlying follow. Disambiguates the React key + any
   *  consumer branch when the same code exists in two sports (an NFL "CLE"
   *  Browns follow and an NBA "CLE" Cavaliers follow share kind+id). */
  sport: Sport;
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
export type TodaySource = "nba" | "wc" | "nfl";

/** Sport register for headline copy + eyebrow color. Mirrors TodaySource;
 *  named separately because the headline also has a sport-less "mute". */
export type HeadlineTone = TodaySource;

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
  /** Raw ISO kickoff time. Feeds the day-aware kickoff stamp (kickoffStamp)
   *  so a later-day row shows "SAT 1:00 PM" instead of a bare, misleading
   *  "1:00 PM". Kept alongside detail (which carries the pre-formatted time
   *  + context) so the stamp can recompute against the current day. */
  dateIso: string;
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
  /** True when the scheduled start has passed but the feed hasn't flipped
   *  to live yet (ESPN's pre→in lag). The game stays on the slate reading
   *  "STARTING" instead of vanishing at the exact minute the user checks
   *  (audit 2026-07-06 #1). */
  imminent?: boolean;
  watch?: { channel: string; stream?: string };
  href: string;
  spoilerSubject: string;
  /** Raw display facts for when this item becomes the Front Page lead
   *  (the System D monument needs names + a parseable status line). */
  game?: TodayLeadGame;
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
  /** The tournament champion, carried on the WC wind-down variant so the
   *  card can name it. The card gates the name on No-Spoilers (headline
   *  above stays safe/generic). Absent when the user follows the winner
   *  (their follower champion card already names it) or off the WC variant. */
  champion?: WCChampion;
  /** Both final participants. Needed so selective No-Spoilers for the losing
   *  finalist also hides the champion result on the wind-down card. */
  championParticipantCodes?: string[];
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
  /** Shared reveal identity for this result across Schedule/detail/Today. */
  gameId: string;
  countryCode: string;
  /** The other finalist in this knockout match. Selective No-Spoilers must
   *  protect the result when either participant is hidden. */
  opponentCode: string;
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

export type RecapFinal = {
  source: TodaySource;
  id: string;
  awayCode: string;
  homeCode: string;
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
  /** Untruncated same-day personal finals. Presentation labels and Quiet
   *  Wrap's three-row cap must never decide recap truth or privacy. */
  recapFinals: RecapFinal[];
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
  /** The alert truth loop (2026-07-14 review): when a followed match the user
   *  had alerts on finished in the last day, we ask once whether the alerts
   *  were enough. Null when there's nothing recent + alerted to ask about. */
  reliancePrompt: ReliancePrompt | null;
};

export type ReliancePrompt = {
  gameId: string;
  sport: "nba" | "wc";
  tier: AlertPreset;
  /** A directly-followed team/country/series vs a broad tournament follow. */
  followKind: "direct" | "tournament";
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

function gameIncludesNflTeam(g: NFLGameLite, abbr: string): boolean {
  const code = abbr.toUpperCase();
  return (
    g.away.abbreviation.toUpperCase() === code ||
    g.home.abbreviation.toUpperCase() === code
  );
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

// ── Lead game view model (System D monument) ─────────────────────────
// The lead's raw display facts — codes, names, scores, and a PARSEABLE
// status line — lifted from the already-fetched game the hero / up-next
// logic picked. View-model enrichment only: no new fetches, no store or
// API changes. The System D monument renders real numerals and a real
// clock; the headline/deck strings stay the calm editorial layer on top.

export type TodayLeadGame = {
  source: TodaySource;
  gameId: string;
  awayCode: string;
  homeCode: string;
  awayName: string;
  homeName: string;
  /** null for upcoming games — nothing to show yet. */
  awayScore: number | null;
  homeScore: number | null;
  status: "live" | "upcoming" | "final";
  /** Raw feed clock/status ("50'", "Q3 · 4:21") — parseable by
   *  computeLiveActivityProgress, the same contract LiveActivitySync
   *  uses for the lock-screen rail. */
  statusLine: string;
  /** Raw WC stage ("Group L", "Quarterfinals") — drives the
   *  elimination-law peak check. Unset for NBA (gameContext flags land
   *  in D2). */
  stage?: string;
  /** Kicker-ready context: WC "Group E" (falls back to the stage),
   *  NBA gameContext ("Game 6"). */
  contextLabel?: string;
  spoilerSubject: string;
};

export function wcLeadGame(g: WCGameLite): TodayLeadGame {
  const upcoming = g.status === "upcoming";
  return {
    source: "wc",
    gameId: g.id,
    awayCode: g.away.abbreviation,
    homeCode: g.home.abbreviation,
    awayName: g.away.name,
    homeName: g.home.name,
    awayScore: upcoming ? null : g.away.score,
    homeScore: upcoming ? null : g.home.score,
    status: g.status,
    statusLine: g.statusText,
    stage: g.stage || undefined,
    // The live feed's stage already reads "Group L" during groups; the
    // preview seed carries a generic stage plus a group letter, so
    // prefer the letter when present.
    contextLabel: g.group ? `Group ${g.group}` : g.stage || undefined,
    spoilerSubject: `${g.away.abbreviation} vs ${g.home.abbreviation}`,
  };
}

export function nbaLeadGame(g: NBAGame): TodayLeadGame {
  const upcoming = g.status === "upcoming";
  return {
    source: "nba",
    gameId: g.id,
    awayCode: g.away.abbreviation,
    homeCode: g.home.abbreviation,
    awayName: g.away.name,
    homeName: g.home.name,
    awayScore: upcoming ? null : g.away.score,
    homeScore: upcoming ? null : g.home.score,
    status: g.status,
    statusLine: g.statusText,
    // NBA peak flags (Game 7 / clinch) are D2 — no stage here.
    contextLabel: g.gameContext || undefined,
    spoilerSubject: g.matchup || `${g.away.abbreviation} vs ${g.home.abbreviation}`,
  };
}

export function nflLeadGame(g: NFLGameLite): TodayLeadGame {
  const upcoming = g.status === "upcoming";
  return {
    source: "nfl",
    gameId: g.id,
    awayCode: g.away.abbreviation,
    homeCode: g.home.abbreviation,
    awayName: g.away.name,
    homeName: g.home.name,
    awayScore: upcoming ? null : g.away.score,
    homeScore: upcoming ? null : g.home.score,
    status: g.status,
    // "Q3 8:24" — parseable by computeLiveActivityProgress (15-min quarters).
    statusLine: g.statusText,
    // Postseason only — the register's elimination law peaks on playoff
    // football, never on a preseason or regular-season game. Doubles as the
    // isPlayoff signal for consumers that only see TodayLeadGame.
    stage: g.seasonType === 3 ? nflWeekLabel(g.seasonType, g.week) : undefined,
    // Season-type aware: a preseason game must never read "Week 2" as if it
    // counted, and a playoff week gets its name ("Wild Card").
    contextLabel: nflWeekLabel(g.seasonType, g.week),
    spoilerSubject: `${g.away.abbreviation} at ${g.home.abbreviation}`,
  };
}

// ── Hero pick ─────────────────────────────────────────────────────────
// One earned, personal moment. A game can lead only when it is pinned or
// covered by a team, country, series, or tournament follow. Today never fills
// this slot with a generic live game from the wider feed.

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
  nfl: NFLGameLite[],
  follows: Follow[],
  pinned: PinnedGame[],
  now: Date = new Date()
): TodayHero | null {
  // Path B collision guard: only NBA team follows match NBA games (an NFL
  // "LAC" follow must never light up the NBA Clippers).
  const followedTeams = teamFollowCodes(follows, "nba");
  const pinnedIds = new Set(pinned.map((p) => p.gameId));

  const followedCountries = new Set(
    follows.filter((f) => f.kind === "country").map((f) => f.id)
  );
  const followedSeries = follows
    .filter((f) => f.kind === "series")
    .map((f) => f.id);
  const followsNbaTour = follows.some(
    (f) =>
      f.kind === "tournament" &&
      getTournament(f.id)?.accent === "var(--nba)"
  );
  const followsWcTour = follows.some(
    (f) =>
      f.kind === "tournament" &&
      getTournament(f.id)?.accent === "var(--wc)"
  );
  // Path B collision guard again: NFL team codes resolve through the NFL
  // moment only (an NBA "LAC" follow must never light up the Chargers).
  const followedNflTeams = teamFollowCodes(follows, "nfl");
  const followsNflTour = follows.some(
    (f) =>
      f.kind === "tournament" &&
      getTournament(f.id)?.accent === "var(--nfl)"
  );

  const nbaIsPersonal = (g: NBAGame): boolean => {
    if (followsNbaTour) return true;
    if ([...followedTeams].some((abbr) => gameIncludesTeam(g, abbr))) {
      return true;
    }
    return followedSeries.some((sid) => {
      const [a, b] = sid.split("-");
      return !!a && !!b && gameIncludesTeam(g, a) && gameIncludesTeam(g, b);
    });
  };
  const wcIsPersonal = (g: WCGameLite): boolean =>
    followsWcTour ||
    [...followedCountries].some((code) => gameIncludesCountry(g, code));
  const nflIsPersonal = (g: NFLGameLite): boolean =>
    followsNflTour ||
    [...followedNflTeams].some((abbr) => gameIncludesNflTeam(g, abbr));

  const live = [...nba.filter((g) => g.status === "live")].sort(
    (a, b) => scoreClosenessRank(a) - scoreClosenessRank(b)
  );
  const wcLive = wc.filter((g) => g.status === "live");
  const nflLive = nfl.filter((g) => g.status === "live");

  // Pinned wins across sports, then a followed NBA game wins a same-strength
  // tie with a followed WC match. With no personal match, both remain null.
  const pinnedNba = live.find((g) => pinnedIds.has(g.id));
  const pinnedWc = wcLive.find((g) => pinnedIds.has(g.id));
  const pinnedNfl = nflLive.find((g) => pinnedIds.has(g.id));
  const followedNba = live.find(nbaIsPersonal);
  const followedWc = wcLive.find(wcIsPersonal);
  const followedNfl = nflLive.find(nflIsPersonal);
  let heroLive: NBAGame | null = null;
  let heroWcLive: WCGameLite | null = null;
  let heroNflLive: NFLGameLite | null = null;
  if (pinnedNba) heroLive = pinnedNba;
  else if (pinnedWc) heroWcLive = pinnedWc;
  else if (pinnedNfl) heroNflLive = pinnedNfl;
  else if (followedNba) heroLive = followedNba;
  else if (followedWc) heroWcLive = followedWc;
  else if (followedNfl) heroNflLive = followedNfl;

  // Followed-live counts (both sports) drive the personal headline rungs
  // ("United States are live." / "Two of yours are live."). A WC tournament
  // follow covers every match; otherwise count pinned + followed-country/team
  // live games. This is the user's FOLLOWED live set, not the whole feed — a
  // feed-wide count beside one shown game would be a lie (RC4).
  const followedWcLiveCount = wcLive.filter(
    (g) =>
      pinnedIds.has(g.id) ||
      wcIsPersonal(g)
  ).length;
  const followedNbaLiveCount = live.filter(
    (g) =>
      pinnedIds.has(g.id) ||
      nbaIsPersonal(g)
  ).length;
  const followedNflLiveCount = nflLive.filter(
    (g) => pinnedIds.has(g.id) || nflIsPersonal(g)
  ).length;
  const followedLiveCount =
    followedWcLiveCount + followedNbaLiveCount + followedNflLiveCount;

  if (heroWcLive) {
    const isPinned = pinnedIds.has(heroWcLive.id);
    const stage = heroWcLive.stage ? `Summer Soccer · ${heroWcLive.stage}` : "Summer Soccer";
    // When the live hero is a country you follow, name it so the headline can
    // lead personally ("United States are live.").
    const subjectCode = [...followedCountries].find((c) =>
      gameIncludesCountry(heroWcLive, c)
    );
    return {
      kind: "wc-live",
      eyebrow: isPinned ? `Pinned · ${stage}` : stage,
      headline: deriveWCLiveHeadline(heroWcLive),
      subject: subjectCode ? getCountry(subjectCode)?.name : undefined,
      followedLiveCount,
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
      href: withGameOrigin(`/game/${heroWcLive.id}`, "today"),
      spoilerMatchup: `${heroWcLive.away.abbreviation} vs ${heroWcLive.home.abbreviation}`,
      spoilerKind: "live",
      spoilerSubject: `${heroWcLive.away.abbreviation} vs ${heroWcLive.home.abbreviation}`,
      watch: heroWcLive.broadcasts[0]
        ? { channel: heroWcLive.broadcasts[0] }
        : undefined,
      game: wcLeadGame(heroWcLive),
    };
  }

  if (heroLive) {
    const isPinned = pinnedIds.has(heroLive.id);
    const baseEyebrow = heroLive.gameContext || "NBA · Live";
    const watch = heroLive.broadcasts[0]
      ? { channel: heroLive.broadcasts[0] }
      : undefined;
    // NBA has no name table, so the personal headline uses the abbreviation
    // ("NYK are live."). NBA is off-season now anyway; WC gets full names.
    const subjectAbbr = [...followedTeams].find((abbr) =>
      gameIncludesTeam(heroLive, abbr)
    );
    return {
      kind: "nba-live",
      eyebrow: isPinned ? `Pinned · ${baseEyebrow}` : baseEyebrow,
      headline: deriveLiveHeadline(heroLive),
      subject: subjectAbbr,
      followedLiveCount,
      context: heroLive.seriesSummary || undefined,
      stake: heroLive.seriesSummary
        ? prettifySeriesSummary(heroLive.seriesSummary)
        : undefined,
      live: true,
      accent: "var(--nba)",
      pinned: isPinned,
      href: withGameOrigin(`/game/${heroLive.id}`, "today"),
      spoilerMatchup: heroLive.matchup,
      spoilerKind: "live",
      spoilerSubject: heroLive.matchup,
      watch,
      game: nbaLeadGame(heroLive),
    };
  }

  if (heroNflLive) {
    const isPinned = pinnedIds.has(heroNflLive.id);
    const weekLabel = nflWeekLabel(heroNflLive.seasonType, heroNflLive.week);
    const baseEyebrow = `NFL · ${weekLabel}`;
    // Nickname, not the code: "Chiefs are live." reads like a person wrote it.
    const subjectAbbr = [...followedNflTeams].find((abbr) =>
      gameIncludesNflTeam(heroNflLive, abbr)
    );
    const matchup = `${heroNflLive.away.abbreviation} at ${heroNflLive.home.abbreviation}`;
    return {
      kind: "nfl-live",
      eyebrow: isPinned ? `Pinned · ${baseEyebrow}` : baseEyebrow,
      headline: deriveNFLLiveHeadline(heroNflLive),
      subject: subjectAbbr ? getNFLTeam(subjectAbbr)?.name : undefined,
      followedLiveCount,
      context:
        followedNflLiveCount > 1
          ? `${followedNflLiveCount} NFL games live now.`
          : undefined,
      live: true,
      accent: "var(--nfl)",
      pinned: isPinned,
      href: withGameOrigin(`/game/${heroNflLive.id}`, "today"),
      spoilerMatchup: matchup,
      spoilerKind: "live",
      spoilerSubject: matchup,
      watch: heroNflLive.broadcasts[0]
        ? { channel: heroNflLive.broadcasts[0] }
        : undefined,
      game: nflLeadGame(heroNflLive),
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
      href: withGameOrigin(`/game/${todayFollowed.id}`, "today"),
      spoilerMatchup: todayFollowed.matchup,
      spoilerKind: "live",
      spoilerSubject: todayFollowed.matchup,
      watch: todayFollowed.broadcasts[0]
        ? { channel: todayFollowed.broadcasts[0] }
        : undefined,
      game: nbaLeadGame(todayFollowed),
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
  if (
    hoursUntilKickoff > 0 &&
    hoursUntilKickoff <= 24 &&
    (followedCountries.size > 0 || followsWcTour)
  ) {
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

// Football-bespoke live headline. Calm, score-free — the score lives on
// the detail screen. One possession is 8 points (TD + two-point try), so
// that, not basketball's 3, is football's "still anyone's game" line.
export function deriveNFLLiveHeadline(g: NFLGameLite): string {
  const text = (g.statusText ?? "").toLowerCase();
  if (text.includes("half")) return "Halftime.";
  const diff = Math.abs(g.home.score - g.away.score);
  const isOT = g.period >= 5 || text.includes("ot");
  if (isOT) return "Overtime.";
  if (g.period >= 4 && diff <= 8) return "One-score game.";
  if (g.period === 4) return "Fourth quarter underway.";
  if (g.period === 3) return "Third quarter underway.";
  if (g.period === 2) return "Second quarter underway.";
  return "Game is live.";
}

// Soccer-bespoke live headline for the hero. Calm, score-free.
export function deriveWCLiveHeadline(g: WCGameLite): string {
  const text = (g.statusText ?? "").toLowerCase();
  if (text.includes("ht") || text.includes("half")) return "Halftime.";
  if (text.includes("pen")) return "Penalty shootout.";
  const m = text.match(/(\d{1,3})/);
  const min = m ? Number(m[1]) : null;
  // Past 90 with no "+" is extra time (knockouts), not stoppage.
  const isStoppage = /\d\s*'?\s*\+/.test(text);
  if (min != null && min > 90 && !isStoppage) return "Extra time.";
  if (min != null && min >= 90) return "Stoppage time.";
  if (min != null && min > 45) return "Second half underway.";
  if (min != null && min >= 1) return "First half underway.";
  return "Match is live.";
}

// ── You follow ────────────────────────────────────────────────────────

function buildYouFollow(
  nba: NBAGame[],
  wc: WCGameLite[],
  nfl: NFLGameLite[],
  follows: Follow[],
  now = new Date()
): YouFollowItem[] {
  return follows
    .map<YouFollowItem | null>((f) => {
      // Sport of this follow, resolved through its MOMENT (Path B). Carried
      // on every item so the React key + any consumer branch can tell an
      // NFL "CLE" (Browns) from an NBA "CLE" (Cavaliers).
      const sport: Sport = momentSport(f.momentId) ?? "nba";
      // NFL team follow (Path B): never match NBA games or the NBA team
      // page (the LAC collision). With a game on the current-week feed the
      // chip carries its real state; otherwise it routes to the NFL
      // schedule (the NFL team-detail page is a later build).
      if (f.kind === "team" && sport === "nfl") {
        const code = f.scopeId ?? f.id;
        const g = pickRelevantGame(
          nfl.filter((x) => gameIncludesNflTeam(x, code))
        );
        if (g) {
          return {
            kind: "team",
            sport,
            id: code,
            label: code,
            chip: code,
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
            href: withGameOrigin(`/game/${g.id}`, "today"),
          };
        }
        return {
          kind: "team",
          sport,
          id: code,
          label: code,
          chip: code,
          statusLabel: "NFL",
          tone: "upcoming",
          href: "/schedule?scope=all&competition=nfl-season-2026",
        };
      }
      if (f.kind === "team" && sport === "nba") {
        const g = pickRelevantGame(nba.filter((x) => gameIncludesTeam(x, f.id)));
        if (g) {
          return {
            kind: "team",
            sport,
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
            href: withGameOrigin(`/game/${g.id}`, "today"),
          };
        }
        // No live or upcoming game for this team — chip routes to the
        // team detail page (/team/[abbr]) so users can see recent
        // results + series context. Pre-Phase-9 this fell back to
        // /following because no team detail page existed.
        return {
          kind: "team",
          sport,
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
            sport,
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
          sport,
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
          sport,
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
        const concluded = tournamentPhase(f.id) === "concluded";
        return {
          kind: "tournament",
          sport,
          id: f.id,
          label: tournament?.name ?? f.id,
          // A tournament chip shows its name, not a 3-letter code: "SOC"
          // reads like a team abbreviation next to AUT / ARG. The pill
          // can carry the full name since tournament follows are few.
          chip: tournament?.name ?? "Tournament",
          // Concluded tournaments read as wrapped (muted), not an active "Cup".
          statusLabel: concluded ? "Wrapped" : "Cup",
          tone: concluded ? "final" : "current",
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
    dateIso: g.date,
    isToday: isSameDay(g.date),
    dayWord: headlineDayWord(g.date),
    stake: g.seriesSummary ? prettifySeriesSummary(g.seriesSummary) : undefined,
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    href: withGameOrigin(`/game/${g.id}`, "today"),
    spoilerSubject: g.matchup,
    game: nbaLeadGame(g),
  };
}

function nflToUpNext(g: NFLGameLite, pinned: boolean, personal: boolean): UpNextItem {
  return {
    source: "nfl",
    id: g.id,
    pinned,
    personal,
    eyebrow: `NFL · ${formatGameDay(g.date)}`,
    headline: `${g.away.abbreviation} at ${g.home.abbreviation}`,
    // Season-type aware — a preseason game read "Week 2" as if it counted.
    detail: `${formatGameTime(g.date)} · ${nflWeekLabel(g.seasonType, g.week)}`,
    dateIso: g.date,
    isToday: isSameDay(g.date),
    dayWord: headlineDayWord(g.date),
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    href: withGameOrigin(`/game/${g.id}`, "today"),
    spoilerSubject: `${g.away.name} at ${g.home.name}`,
    // Without this the NFL lead fell back to the legacy editorial render
    // instead of the System D Monument (which needs the raw game facts).
    game: nflLeadGame(g),
  };
}

export function wcToUpNext(g: WCGameLite, pinned: boolean, personal: boolean): UpNextItem {
  // ESPN publishes upper-round fixtures before the teams are decided, with
  // slot codes as abbreviations ("QFW1" = quarterfinal winner 1). Those
  // codes are feed jargon — the stage name is the honest headline until
  // the matchup is real (peer review 2026-07-11). Flows to Today's NEXT
  // pointer AND the home-screen widget (WidgetSync reads item.headline).
  const placeholder =
    !isRealCountryCode(g.away.abbreviation) ||
    !isRealCountryCode(g.home.abbreviation);
  const headline = placeholder
    ? g.stage || "Teams to be decided"
    : `${g.away.abbreviation} vs ${g.home.abbreviation}`;
  return {
    source: "wc",
    id: g.id,
    pinned,
    personal,
    eyebrow: `Summer Soccer · ${formatGameDay(g.date, new Date(), "wc")}`,
    headline,
    detail: placeholder
      ? `${formatGameTime(g.date)} · Teams to be decided`
      : `${formatGameTime(g.date)}${g.stage ? " · " + g.stage : ""}`,
    dateIso: g.date,
    isToday: isSameDay(g.date),
    dayWord: headlineDayWord(g.date),
    watch: g.broadcasts[0] ? { channel: g.broadcasts[0] } : undefined,
    // Open the match detail (which supports WC games), consistent with
    // NBA up-next. Was linking to the away country page, so tapping a
    // fixture jumped to a country instead of the game.
    href: withGameOrigin(`/game/${g.id}`, "today"),
    spoilerSubject: headline,
    game: wcLeadGame(g),
  };
}

function buildUpNext(
  nba: NBAGame[],
  wc: WCGameLite[],
  nfl: NFLGameLite[],
  follows: Follow[],
  pinned: PinnedGame[]
): UpNextItem[] {
  // Sport-aware team sets (Path B collision guard, via the shared helpers):
  // an NFL "LAC" follow matches only NFL games, never the NBA LAC.
  const followedTeams = teamFollowCodes(follows, "nba");
  const followedNflTeams = teamFollowCodes(follows, "nfl");
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
  const followsNflTournament = follows.some(
    (f) => f.kind === "tournament" && momentSport(f.momentId) === "nfl"
  );
  const pinnedIds = new Set(pinned.map((p) => p.gameId));

  // Kickoff-passed handling (audit 2026-07-06 #1). Dropping a game the
  // moment its start passes while ESPN still says "upcoming" made the slate
  // (and on a one-game day, the whole Front Page) blank out at the exact
  // minute the user checks for tipoff, then snap to live. Instead: within a
  // 45-minute window after the scheduled start, the game stays on the slate
  // flagged `imminent` (renders "STARTING", never its stale kickoff time —
  // which preserves the original RC3/RC4 fix). Past that window (abandoned /
  // postponed feed rows), it drops as before. A 2-minute grace absorbs
  // clock skew without flagging a genuine pre-match.
  const KICKOFF_GRACE_MS = 2 * 60 * 1000;
  const IMMINENT_WINDOW_MS = 45 * 60 * 1000;
  const kickoffNotPassed = (date: string) =>
    new Date(date).getTime() > Date.now() - KICKOFF_GRACE_MS;
  const kickoffImminent = (date: string) => {
    const t = new Date(date).getTime();
    return (
      t <= Date.now() - KICKOFF_GRACE_MS && t > Date.now() - IMMINENT_WINDOW_MS
    );
  };
  const onSlate = (date: string) =>
    kickoffNotPassed(date) || kickoffImminent(date);

  const nbaUpcoming = nba
    .filter((g) => g.status === "upcoming" && onSlate(g.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const wcUpcoming = wc
    .filter((g) => g.status === "upcoming" && onSlate(g.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nflUpcoming = nfl
    .filter((g) => g.status === "upcoming" && onSlate(g.date))
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
  const nflIsPersonal = (g: NFLGameLite): boolean => {
    if (followsNflTournament) return true;
    const away = g.away.abbreviation;
    const home = g.home.abbreviation;
    return followedNflTeams.has(away) || followedNflTeams.has(home);
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
      item: {
        ...nbaToUpNext(g, pinned, true),
        imminent: kickoffImminent(g.date) || undefined,
      },
    });
  }
  for (const g of wcUpcoming) {
    if (!wcIsPersonal(g)) continue;
    const pinned = pinnedIds.has(g.id);
    candidates.push({
      date: new Date(g.date).getTime(),
      pinned,
      item: {
        ...wcToUpNext(g, pinned, true),
        imminent: kickoffImminent(g.date) || undefined,
      },
    });
  }
  for (const g of nflUpcoming) {
    if (!nflIsPersonal(g)) continue;
    const pinned = pinnedIds.has(g.id);
    candidates.push({
      date: new Date(g.date).getTime(),
      pinned,
      item: {
        ...nflToUpNext(g, pinned, true),
        imminent: kickoffImminent(g.date) || undefined,
      },
    });
  }

  candidates.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.date - b.date;
  });

  // Unsliced (audit 2026-07-06 #3): the old slice(0,5) silently truncated
  // busier days and every downstream count lied with it. The render layer
  // caps VISIBLE rows and adds an honest "+N more" overflow into Schedule;
  // the widget applies its own cap.
  return candidates.map((c) => c.item);
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

function personalFinalMatchers(follows: Follow[]): {
  nba: (game: NBAGame) => boolean;
  wc: (game: WCGameLite) => boolean;
  nfl: (game: NFLGameLite) => boolean;
} {
  // Path B collision guard: only NBA team follows match NBA games (an NFL
  // "LAC" follow must never light up the NBA Clippers).
  const followedTeams = teamFollowCodes(follows, "nba");
  const followedCountries = new Set(
    follows.filter((f) => f.kind === "country").map((f) => f.id)
  );
  const followedSeries = follows
    .filter((f) => f.kind === "series")
    .map((f) => f.id);
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
  const followedNflTeams = teamFollowCodes(follows, "nfl");
  const followsNflTournament = followedTournaments.some(
    (t) => t.accent === "var(--nfl)"
  );

  return {
    nba: (game) => {
      if (followsNbaTournament) return true;
      if ([...followedTeams].some((abbr) => gameIncludesTeam(game, abbr))) {
        return true;
      }
      return followedSeries.some((seriesId) => {
        const [a, b] = seriesId.split("-");
        return (
          Boolean(a) &&
          Boolean(b) &&
          gameIncludesTeam(game, a) &&
          gameIncludesTeam(game, b)
        );
      });
    },
    wc: (game) =>
      followsWcTournament ||
      [...followedCountries].some((code) => gameIncludesCountry(game, code)),
    nfl: (game) =>
      followsNflTournament ||
      [...followedNflTeams].some((abbr) => gameIncludesNflTeam(game, abbr)),
  };
}

function isSameLocalDay(date: string, now: Date): boolean {
  const value = new Date(date);
  return (
    Number.isFinite(value.getTime()) &&
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

function buildRecapFinals(
  nbaRecent: NBAGame[],
  wc: WCGameLite[],
  nfl: NFLGameLite[],
  follows: Follow[],
  now: Date
): RecapFinal[] {
  const personal = personalFinalMatchers(follows);
  const seen = new Set<string>();
  const finals: RecapFinal[] = [];
  const add = (final: RecapFinal) => {
    const key = `${final.source}:${final.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    finals.push(final);
  };

  for (const game of nbaRecent) {
    if (
      game.status !== "final" ||
      !isSameLocalDay(game.date, now) ||
      !personal.nba(game)
    ) {
      continue;
    }
    add({
      source: "nba",
      id: game.id,
      awayCode: game.away.abbreviation,
      homeCode: game.home.abbreviation,
    });
  }
  for (const game of wc) {
    if (
      game.status !== "final" ||
      !isSameLocalDay(game.date, now) ||
      !personal.wc(game)
    ) {
      continue;
    }
    add({
      source: "wc",
      id: game.id,
      awayCode: game.away.abbreviation,
      homeCode: game.home.abbreviation,
    });
  }
  for (const game of nfl) {
    if (
      game.status !== "final" ||
      !isSameLocalDay(game.date, now) ||
      !personal.nfl(game)
    ) {
      continue;
    }
    add({
      source: "nfl",
      id: game.id,
      awayCode: game.away.abbreviation,
      homeCode: game.home.abbreviation,
    });
  }
  return finals;
}

function buildQuietWrap(
  nbaRecent: NBAGame[],
  wc: WCGameLite[],
  nfl: NFLGameLite[],
  follows: Follow[],
  now = new Date()
): QuietWrapItem[] {
  const cutoffMs = now.getTime() - QUIET_WRAP_WINDOW_DAYS * 86_400_000;
  const inWindow = (date: string) => {
    const ms = new Date(date).getTime();
    return Number.isFinite(ms) && ms >= cutoffMs;
  };

  const personal = personalFinalMatchers(follows);

  // Both sports flow into one ranked list. Quiet Wrap was NBA-only until
  // Summer Soccer finals were wired into the same path. The newest personal
  // final wins regardless of sport, so today's soccer final can sit above
  // last night's NBA game.
  type Entry =
    | { source: "nba"; ms: number; personal: boolean; g: NBAGame }
    | { source: "wc"; ms: number; personal: boolean; g: WCGameLite }
    | { source: "nfl"; ms: number; personal: boolean; g: NFLGameLite };

  const nbaEntries: Entry[] = nbaRecent
    .filter((g) => g.status === "final" && inWindow(g.date))
    .map((g) => ({
      source: "nba",
      ms: new Date(g.date).getTime(),
      personal: personal.nba(g),
      g,
    }));

  const wcEntries: Entry[] = wc
    .filter((g) => g.status === "final" && inWindow(g.date))
    .map((g) => ({
      source: "wc",
      ms: new Date(g.date).getTime(),
      personal: personal.wc(g),
      g,
    }));

  const nflEntries: Entry[] = nfl
    .filter((g) => g.status === "final" && inWindow(g.date))
    .map((g) => ({
      source: "nfl",
      ms: new Date(g.date).getTime(),
      personal: personal.nfl(g),
      g,
    }));

  // Today's contract is "only what you follow". There is no discovery fill:
  // a fresh user sees no wrap, and a returning user never gets unrelated
  // finals just because fewer than three personal games have wrapped.
  const selected = [...nbaEntries, ...wcEntries, ...nflEntries]
    .filter((e) => e.personal)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 3);

  return selected.map<QuietWrapItem>((e) => {
    const dayLabel = quietWrapDayLabel(e.g.date, now);
    // Use "vs" to match the Up Next + game-detail pattern. The Quiet
    // Wrap card is a final-score line, not a series label.
    const matchup = `${e.g.away.abbreviation} vs ${e.g.home.abbreviation}`;
    const scoreLine = `${e.g.away.score} – ${e.g.home.score}`;

    if (e.source === "nfl") {
      const g = e.g;
      return {
        source: "nfl",
        id: g.id,
        // The week label carries the honesty a preseason final needs — the
        // row must never read like a game that counted.
        eyebrow: `${dayLabel} · ${nflWeekLabel(g.seasonType, g.week)}`,
        // Football says "at", not "vs" — the away team travels.
        matchup: `${g.away.abbreviation} at ${g.home.abbreviation}`,
        scoreLine,
        context: "Final.",
        spoilerSubject: `${g.away.abbreviation} at ${g.home.abbreviation}`,
        kind: "final",
        href: withGameOrigin(`/game/${g.id}`, "today"),
      };
    }

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
        href: withGameOrigin(`/game/${e.g.id}`, "today"),
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
      href: withGameOrigin(`/game/${g.id}`, "today"),
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

// NBA team codes only — this feeds pickClosing's NBA series-clinch match,
// so an NFL team follow must not leak in (Path B collision guard).
function followedTeamIds(follows: Follow[]): Set<string> {
  return teamFollowCodes(follows, "nba");
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
  now = new Date(),
  champion: WCChampion | null = null
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

  // ── Tournament variant (World Cup wind-down) ──
  // The final is decided (champion frozen) and the slate is quiet. Name the
  // champion for the first TOURNAMENT_CLOSE_WINDOW_DAYS, then fall through to
  // the dead-zone card. The champion object rides along so the card can name
  // the winner (spoiler-gated); the headline here stays safe/generic. When
  // the user follows the winner we drop the champion so their follower
  // champion card names it instead — no double naming on one screen.
  if (!hasLive && !hasUpcoming && champion && champion.decidedAt >= tournamentWindowMs) {
    const followsChampion = follows.some(
      (f) =>
        f.kind === "country" &&
        f.id.toUpperCase() === champion.code
    );
    return {
      id: "tournament:wc-2026",
      kind: "tournament",
      eyebrow: "Tournament wrapped",
      headline: "Summer Soccer is over.",
      detail: "We'll be back when the next moment matters.",
      dots: [],
      champion: followsChampion ? undefined : champion,
      championParticipantCodes: [champion.awayCode, champion.homeCode],
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
          // NFL is the next scheduled moment in the product. The 2026
          // opener is confirmed (see nfl-dates.ts), so we name the date.
          detail: `Nothing live or coming up. NFL opens ${NFL_2026_SEASON_OPENER.label}.`,
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
            : withGameOrigin(`/game/${top.gameId}`, "today"),
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
// "Followed" = pinned, a direct team/country, an exact series matchup, or a
// covering tournament.
function buildScoreboard(
  nba: NBAGame[],
  wc: WCGameLite[],
  nfl: NFLGameLite[],
  follows: Follow[],
  pinned: PinnedGame[]
): ScoreboardTile[] {
  const pinnedIds = new Set(pinned.map((p) => p.gameId));
  const nbaFollowCoverage = buildNBAFollowCoverage(follows);
  const wcCodes = new Set<string>();
  const nflCodes = teamFollowCodes(follows, "nfl");
  let wcTour = false;
  let nbaTour = false;
  let nflTour = false;
  for (const f of follows) {
    if (f.kind === "country") wcCodes.add(f.id.toUpperCase());
    else if (f.kind === "tournament") {
      const accent = getTournament(f.id)?.accent;
      if (accent === "var(--wc)") wcTour = true;
      if (accent === "var(--nba)") nbaTour = true;
      if (accent === "var(--nfl)") nflTour = true;
    }
  }
  const covered = (away: string, home: string, sport: "nba" | "wc", id: string) =>
    pinnedIds.has(id) ||
    (sport === "wc" ? wcTour : nbaTour) ||
    (sport === "wc"
      ? wcCodes.has(away.toUpperCase()) || wcCodes.has(home.toUpperCase())
      : nbaGameMatchesFollowCoverage(nbaFollowCoverage, away, home));
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
      href: withGameOrigin(`/game/${g.id}`, "today"),
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
      href: withGameOrigin(`/game/${g.id}`, "today"),
      lead: leadOf(g.away.score, g.home.score),
    });
  }
  for (const g of nfl) {
    if (g.status !== "live") continue;
    // Path B collision guard: NFL codes come from NFL follows only.
    const coveredNfl =
      pinnedIds.has(g.id) ||
      nflTour ||
      nflCodes.has(g.away.abbreviation.toUpperCase()) ||
      nflCodes.has(g.home.abbreviation.toUpperCase());
    if (!coveredNfl) continue;
    tiles.push({
      id: g.id,
      source: "nfl",
      awayCode: g.away.abbreviation,
      homeCode: g.home.abbreviation,
      awayScore: g.away.score,
      homeScore: g.home.score,
      status: "live",
      statusLine: g.statusText || "Live",
      stageLine: `NFL · ${nflWeekLabel(g.seasonType, g.week)}`,
      href: withGameOrigin(`/game/${g.id}`, "today"),
      lead: leadOf(g.away.score, g.home.score),
    });
  }
  // Live games only. Upcoming games live in the Up Next list (time-forward,
  // with channels) — surfacing them here too produced a redundant grid of
  // score-less "—" tiles duplicating that list, especially for a tournament
  // follower whose whole slate is "personal".
  return tiles.slice(0, 12);
}

// ── Reliance prompt (the alert truth loop) ────────────────────────────
// The most recent followed match (last 24h) the user had ALERTS ON — you can
// only rate alert reliance if you were relying on alerts. Prefers a direct
// follow (your team/country/series) over a broad tournament follow, since a
// direct follow is the sharper signal. Pure.

function matchAlertFollow(
  follows: Follow[],
  sport: "nba" | "wc",
  away: string,
  home: string
): { tier: AlertPreset; kind: "direct" | "tournament" } | null {
  let tournament: { tier: AlertPreset; kind: "tournament" } | null = null;
  for (const f of follows) {
    if (!f.alertEnabled) continue;
    if (sport === "wc") {
      if (f.kind === "country" && (f.id === away || f.id === home)) {
        return { tier: f.alertTier, kind: "direct" };
      }
      if (f.kind === "tournament" && f.id.startsWith("fifa-world-cup-")) {
        tournament = { tier: f.alertTier, kind: "tournament" };
      }
    } else {
      // NBA only — an NFL team follow (Path B) must not match an NBA game.
      if (
        f.kind === "team" &&
        momentSport(f.momentId) === "nba" &&
        (f.id === away || f.id === home)
      ) {
        return { tier: f.alertTier, kind: "direct" };
      }
      if (f.kind === "series") {
        const [a, b] = f.id.split("-");
        const has = (c: string) => c === away || c === home;
        if (a && b && has(a) && has(b)) return { tier: f.alertTier, kind: "direct" };
      }
      if (f.kind === "tournament" && f.id.startsWith("nba-playoffs-")) {
        tournament = { tier: f.alertTier, kind: "tournament" };
      }
    }
  }
  return tournament;
}

function buildReliancePrompt(
  nbaRecent: NBAGame[],
  wc: WCGameLite[],
  follows: Follow[],
  now: Date
): ReliancePrompt | null {
  if (!follows.some((f) => f.alertEnabled)) return null;
  const windowMs = now.getTime() - 24 * 60 * 60 * 1000;

  const cands: { p: ReliancePrompt; ms: number }[] = [];
  const consider = (
    id: string,
    date: string,
    sport: "nba" | "wc",
    away: string,
    home: string
  ) => {
    const ms = new Date(date).getTime();
    if (!Number.isFinite(ms) || ms < windowMs) return;
    const m = matchAlertFollow(follows, sport, away, home);
    if (!m) return;
    cands.push({ p: { gameId: id, sport, tier: m.tier, followKind: m.kind }, ms });
  };

  for (const g of nbaRecent) {
    if (g.status === "final") {
      consider(g.id, g.date, "nba", g.away.abbreviation, g.home.abbreviation);
    }
  }
  for (const g of wc) {
    if (g.status === "final") {
      consider(g.id, g.date, "wc", g.away.abbreviation, g.home.abbreviation);
    }
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.ms - a.ms);
  return cands[0].p;
}

export function buildTodayPayload({
  nba,
  nbaRecent,
  wc,
  nfl,
  follows,
  pinned,
  champion = null,
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
  /** Current-week NFL games (Phase 22). Feeds a followed team's next game
   *  into Up Next; empty out of season. */
  nfl?: NFLGameLite[];
  follows: Follow[];
  pinned: PinnedGame[];
  /** The frozen tournament champion (from the WC feed), or null until the
   *  final is decided. Feeds the WC wind-down moment. */
  champion?: WCChampion | null;
  now?: Date;
}): TodayPayload {
  const recentForWrap = nbaRecent && nbaRecent.length > 0 ? nbaRecent : nba;
  const nflGames = nfl ?? [];
  const hero = pickHero(nba, wc, nflGames, follows, pinned, now);
  const youFollow = buildYouFollow(nba, wc, nflGames, follows, now);
  // Up Next uses the WIDER window (seriesGames, ~2 weeks ahead), not the
  // current calendar week. The full playoff slate runs past this week
  // (e.g. Games 3-4 land next week), and they must appear before the
  // Summer Soccer openers. buildUpNext filters to status==="upcoming", so the
  // wider window's past finals are dropped — only the forward games stay.
  const upNext = buildUpNext(recentForWrap, wc, nflGames, follows, pinned);
  const quietWrap = buildQuietWrap(recentForWrap, wc, nflGames, follows, now);
  const recapFinals = buildRecapFinals(recentForWrap, wc, nflGames, follows, now);
  const reminder = buildReminder(follows, now);

  const scoreboard = buildScoreboard(nba, wc, nflGames, follows, pinned);
  // The feed can contain unrelated live games. Today state and calm endings
  // key off the user's personal live slate, not the provider-wide feed.
  const hasLive = scoreboard.length > 0;
  const hasUpcoming = upNext.length > 0;
  // A personal game scheduled for *tonight* (same calendar day as now)
  // counts as live-stakes context, even if tipoff hasn't happened yet.
  // Without this gate, the Today headline drops to "Quiet for now."
  // while a followed team's game is hours away — which is the exact
  // moment the page should feel most anticipatory. Reported from a
  // real-world session: NYK vs SA was listed in NEXT UP with the
  // "TONIGHT" eyebrow, and the headline still said "Quiet for now."
  const hasTonightUpcoming = upNext.some((item) => item.isToday);
  const closing = pickClosing(
    recentForWrap,
    follows,
    hasLive,
    hasUpcoming,
    now,
    champion
  );
  const pinnedSummary = buildPinnedSummary(nba, recentForWrap, wc, pinned);
  // Recap truth is untruncated and structured. Quiet Wrap is a three-row
  // presentation list whose NBA eyebrows can include "Game N"; neither its
  // cap nor its copy should decide whether tonight's personal slate wrapped.
  const hasTonightFinals = recapFinals.length > 0;
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
  const finalsCount = slateComplete ? recapFinals.length : 0;

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
    recapFinals,
    closing,
    pinnedSummary,
    knockoutMoments: buildKnockoutMoments(wc, follows),
    scoreboard,
    reliancePrompt: buildReliancePrompt(recentForWrap, wc, follows, now),
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
      gameId: game.id,
      countryCode: code,
      opponentCode:
        game.away.abbreviation === code
          ? game.home.abbreviation
          : game.away.abbreviation,
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
  /** Raw ISO kickoff for an upcoming lead. Lets the Monument kicker carry a
   *  day-aware time ("TODAY 4:00 PM" / "MON 3:00 PM") so the hero answers
   *  "when" in one place. Unset for live leads and the hero fallback. */
  dateIso?: string;
  /** Scheduled start passed, feed not live yet — the kicker reads
   *  "STARTING" instead of the stale kickoff time. */
  imminent?: boolean;
  accent: TodayAccent;
  href: string;
};

export type TodayHeadline = {
  eyebrow: { label: string; tone: HeadlineTone | "mute" };
  headline: string;
  /** Optional support line under the deck (a stake, when we have one). */
  support?: string;
  /** The single lead game as a deck card. Null on quiet / countdown days. */
  deck: TodayHeadlineDeck | null;
  /** True when the lead is a live game. Drives the pulsing dot on the
   *  Front Page deck so the user instantly sees something is happening. */
  live: boolean;
  /** The lead game's raw facts (names, scores, parseable clock) for the
   *  System D monument render. Unset on quiet / countdown days. */
  game?: TodayLeadGame;
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
 *  stake (when one exists), plus the raw game facts for the monument.
 *  Deck, stake, and game always describe the SAME game so the support
 *  line can't drift from the card above it. */
type LeadGame = { deck: TodayHeadlineDeck; stake?: string; game?: TodayLeadGame };

/** Knockout stake line for a Summer Soccer lead, derived from the stage —
 *  fixed tournament structure, not a prediction ("Winner goes through to
 *  the quarterfinals."). NBA leads carry their series stake instead; group
 *  matches carry none. Order matters below: "quarterfinals" and
 *  "semifinals" both contain "final". Exported for the copy tests. */
export function wcKnockoutStake(game?: TodayLeadGame): string | undefined {
  if (!game || game.source !== "wc") return undefined;
  const s = (game.stage ?? "").toLowerCase();
  if (s.includes("round of 32")) return "Winner goes through to the Round of 16.";
  if (s.includes("round of 16")) return "Winner goes through to the quarterfinals.";
  if (s.includes("quarter")) return "Winner goes through to the semifinals.";
  if (s.includes("semi")) return "Winner plays in the final.";
  if (s.includes("final")) return "One match for the title.";
  return undefined;
}

/** Build the lead game from the live hero (preferred), then the first
 *  up-next item, then any non-countdown hero. Returns null for non-game
 *  leads (WC countdown, quiet day). */
/** The accent token for a source. One switch so a new sport can't be
 *  half-threaded through the headline layer. */
export function accentFor(source: TodaySource): TodayAccent {
  if (source === "wc") return "var(--wc)";
  if (source === "nfl") return "var(--nfl)";
  return "var(--nba)";
}

function toneForAccent(accent: TodayAccent | undefined): HeadlineTone {
  if (accent === "var(--wc)") return "wc";
  if (accent === "var(--nfl)") return "nfl";
  return "nba";
}

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
      stake: hero.stake ?? wcKnockoutStake(hero.game),
      game: hero.game,
    };
  }

  // Upcoming — the up-next item already carries the "time · context"
  // detail ("8:30 PM · Game 6") and the broadcast the deck wants.
  // Prefer TODAY'S first game: the Monument is Today's lead, and a pinned
  // future game sorting to upNext[0] must not displace a game that's
  // actually on today (S1 — Today is today + one pointer, the pointer
  // handles the future).
  const up = payload.upNext.find((i) => i.isToday) ?? payload.upNext[0];
  if (up) {
    return {
      deck: {
        matchup: up.headline,
        detail: up.detail,
        broadcast: up.watch?.channel,
        dateIso: up.dateIso,
        imminent: up.imminent,
        accent: accentFor(up.source),
        href: up.href,
      },
      stake: up.stake ?? wcKnockoutStake(up.game),
      game: up.game,
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
      stake: hero.stake ?? wcKnockoutStake(hero.game),
      game: hero.game,
    };
  }

  return null;
}

// NBA playoff games are evening events → "tonight"; Summer Soccer and NFL
// games run through the afternoon → "today" (a 1:00 PM Sunday kickoff is
// not "tonight"). The headline is about the day you care about, not a
// generic "up next" — the eyebrow carries the live/upcoming state.
function whenWord(tone: HeadlineTone): string {
  return tone === "nba" ? "tonight" : "today";
}

// Plural form — "matches" / "games". "match" pluralizes with -es, so a
// blunt `${noun}s` produced the "matchs" typo.
function sportNounPlural(tone: HeadlineTone): string {
  return tone === "wc" ? "matches" : "games";
}

// "AUT vs ARG" -> "Austria vs Argentina" for the lead headline. Resolves
// country codes to names (Summer Soccer); NBA codes pass through (no name
// table, and not the live season). Spoiler-safe — it names the fixture,
// never a score, so it's the same exposure as the deck below it.
function editorialMatchup(matchup: string, tone: HeadlineTone): string {
  if (tone === "nfl") {
    // "LAC at KC" -> "Chargers at Chiefs". Nicknames, not cities: the
    // headline stays one line and reads the way people talk.
    const parts = matchup.split(/\s+at\s+/i);
    if (parts.length !== 2) return matchup;
    const [a, b] = parts.map(
      (p) => getNFLTeam(p.trim().toUpperCase())?.name ?? p.trim()
    );
    return `${a} at ${b}`;
  }
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
  const heroTone: HeadlineTone = toneForAccent(payload.hero?.accent);

  // Live takes the lead. The headline counts LIVE games and says so, to
  // match the "Live now" eyebrow — saying "One game today" while the
  // Upcoming list below shows several more reads as a contradiction. The
  // count is the live slate (pinned-live / live hero), not the day's slate.
  if (heroLive || payload.pinnedSummary.live > 0) {
    const lc = Math.max(payload.pinnedSummary.live, heroLive ? 1 : 0, 1);
    const subject = payload.hero?.subject;
    const followedLive = payload.hero?.followedLiveCount ?? 0;
    return {
      eyebrow: { label: "Live now", tone: heroTone },
      // Personal rungs lead: when 2+ of your follows are live, count them
      // ("Two of yours are live."); when exactly one is, name it ("United
      // States are live."). Otherwise fall back to the matchup (one live
      // game) or the live count — the eyebrow + pulse already say it's live.
      headline:
        followedLive >= 2
          ? `${spellCount(followedLive)} of yours are live.`
          : subject
            ? `${subject} are live.`
            : lc === 1 && deck
              ? `${editorialMatchup(deck.matchup, heroTone)}.`
              : `${spellCount(lc)} ${sportNounPlural(heroTone)} live.`,
      // Support line: a series stake ("OKC leads series 3-2") when the
      // lead is a playoff game, else the hero's context line. For a busy
      // Summer Soccer slate that context is "N Summer Soccer matches live now." —
      // so the user sees the wider slate even though the deck shows one.
      support: lead?.stake ?? payload.hero?.context,
      deck,
      live: true,
      game: lead?.game,
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
      const tone: HeadlineTone = todayItems[0].source;
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
        game: lead?.game,
      };
    }

    // Nothing on today — lead with the soonest upcoming day and count
    // only the games that share it ("One match Saturday.").
    const lead0 = payload.upNext[0];
    const day = lead0.dayWord;
    const n = payload.upNext.filter((u) => u.dayWord === day).length;
    const tone: HeadlineTone = lead0.source;
    return {
      eyebrow: { label: "Up next", tone },
      headline:
        n === 1 && deck
          ? `${editorialMatchup(deck.matchup, tone)} ${day}.`
          : `${spellCount(n)} ${sportNounPlural(tone)} ${day}.`,
      support: lead?.stake,
      deck,
      live: false,
      game: lead?.game,
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

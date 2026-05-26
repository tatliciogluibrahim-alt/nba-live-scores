// Series Detail data layer — adapter on top of the existing
// buildBracketSeries() and series helpers from app/nba/lib.
//
// Returns a SeriesPayload tuned for a single-screen NBA Series Detail.
// All spoiler-sensitive fields are kept separate from safe ones so the
// view layer can render or redact per No-Spoilers state.

import type { Game, SeriesInfo, Team } from "../../nba/types";
import { buildBracketSeries } from "../../nba/lib/series";
import { getGameNumberFromText } from "../../nba/lib/moment-intelligence";
import { deriveSeriesContext } from "../game/nba-moments";
import { deriveSeriesDots } from "./series-derive";

// ── Series dot — one slot in the 7-game strip ─────────────────────────

export type SeriesDotState =
  | "played"        // game is final
  | "live"          // game is in progress
  | "next"          // soonest upcoming game in the series
  | "scheduled"     // upcoming and not the next one
  | "if-necessary"  // games 5-7 that may not be played (series clinched)
  | "tbd";          // slot is open and we have no info yet

export type SeriesDot = {
  number: number;           // 1..7
  state: SeriesDotState;
  gameId?: string;          // link target when present
  date?: string;            // ISO when present
  awayCode?: string;
  homeCode?: string;
  scoreLine?: string;       // "112 – 108" — spoilery, view layer gates
  /** Abbreviation of the team that won this game. Populated only for final
   *  games where away/home scores are known. Spoilery — view layer gates. */
  winnerCode?: string;
  /** When true, this game settled the series. View layer redacts under NS. */
  isClincher?: boolean;
};

// ── Related-game row ──────────────────────────────────────────────────

export type SeriesGameRow = {
  id: string;
  number: number | null;
  label: string;             // "Game 4 · Mon, May 22"
  status: "live" | "upcoming" | "final";
  awayCode: string;
  homeCode: string;
  scoreLine: string | null;  // spoilery
  href: string;              // /game/{id}
};

// ── Full payload ──────────────────────────────────────────────────────

export type SeriesPayload = {
  key: string;
  abbrA: string;
  abbrB: string;
  teamA: { abbr: string; name: string };
  teamB: { abbr: string; name: string };

  /** Header eyebrow line, safe under No-Spoilers (e.g. "NBA · East Semifinals · Game 4"). */
  headerEyebrow: string;
  /** Tournament status label for the header pill (safe). */
  statusLabel: "Live" | "Upcoming" | "Final" | "Series";

  /** Spoilery — the API series summary, e.g. "DET leads series 2-1". */
  spoilerySummary: string;

  /** Calm sentence safe to show always (e.g. "Game 4 is next."). */
  safeStakeLine: string;
  /** Spoilery stake (e.g. "DET can clinch."). Only show when NS is off. */
  spoileryStakeLine: string;

  dots: SeriesDot[];

  nextGame: {
    id: string;
    date: string;
    awayCode: string;
    homeCode: string;
    broadcasts: string[];
    gameNumberLabel: string;  // "Game 5"
  } | null;

  games: SeriesGameRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────

function teamSlim(team: Team & { wins: number }) {
  return { abbr: team.abbreviation, name: team.name };
}

function gameRowLabel(g: Game, gameNumber: number | null): string {
  const dateLabel = new Date(g.date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return gameNumber ? `Game ${gameNumber} · ${dateLabel}` : dateLabel;
}

/** Derive a game number for each played/scheduled game from the API context
 *  string, falling back to chronological order. The result is 1-indexed. */
function deriveGameNumber(g: Game, index: number): number {
  const fromContext = getGameNumberFromText(
    [g.gameContext, g.seriesSummary].filter(Boolean).join(" ")
  );
  return fromContext ?? index + 1;
}

function buildSafeStake(series: SeriesInfo, nextGameNumber: number | null): string {
  // Safe phrasing only — never references leader, margin, or clinch.
  if (series.status === "live") {
    return nextGameNumber
      ? `Game ${nextGameNumber} is live.`
      : "Game is live.";
  }
  if (series.status === "upcoming" && nextGameNumber) {
    return `Game ${nextGameNumber} is next.`;
  }
  // Wrapped series: a NS-safe "this is done" line. Saying "in progress"
  // here misleads the user — it was the source of the "ongoing but
  // also Cleveland won 4-0" contradiction on the NYK/CLE page.
  if (series.status === "complete") {
    return "Series wrapped.";
  }
  // Truly safe fallback for the rare middle-window state where we have
  // no live, no upcoming, AND no parsed wins (e.g. a series we know
  // exists from `seriesMemory` but no games are currently in the feed).
  return "Series in progress.";
}

function buildSpoileryStake(series: SeriesInfo): string {
  // Mirror the legacy helper's outputs but keep them isolated so the view
  // layer can opt-in. The view treats these as spoilery and gates on NS.
  const high = Math.max(series.teamA.wins, series.teamB.wins);
  const low = Math.min(series.teamA.wins, series.teamB.wins);
  const leader =
    series.teamA.wins > series.teamB.wins
      ? series.teamA
      : series.teamB.wins > series.teamA.wins
        ? series.teamB
        : null;

  if (high === 4) {
    const winner = series.teamA.wins === 4 ? series.teamA : series.teamB;
    return `${winner.abbreviation} won the series ${high}–${low}.`;
  }
  if (series.isGame7) return `Game 7. Winner takes the series.`;
  if (high === 3 && leader) return `${leader.abbreviation} can clinch.`;
  if (high === series.teamA.wins && series.teamA.wins === series.teamB.wins && high > 0) {
    return `Series tied ${high}–${low}.`;
  }
  if (leader) return `${leader.abbreviation} leads ${high}–${low}.`;
  return "";
}

function statusLabel(series: SeriesInfo): SeriesPayload["statusLabel"] {
  if (series.status === "live") return "Live";
  if (series.status === "upcoming") return "Upcoming";
  if (series.status === "complete") return "Final";
  return "Series";
}

// ── Public entry points ───────────────────────────────────────────────

export function buildSeriesPayload(
  gameList: Game[],
  key: string
): SeriesPayload | null {
  const allSeries = buildBracketSeries(gameList);
  // Match against the stored sorted-abbr key (e.g. "CLE-NYK"). Also accept
  // unsorted input from a follow id like "NYK-CLE" by sorting.
  const sortedKey = key.split("-").sort().join("-");
  const series = allSeries.find((s) => s.key === sortedKey);
  if (!series) return null;

  // First-pass safe header: "NBA · East Semifinals · Game N" if a live or
  // next game can pin a number. Otherwise drop the trailing segment.
  const referenceGame = series.nextGame ?? series.latestGame ?? series.games[0];
  const safeContext = referenceGame ? deriveSeriesContext(referenceGame) : null;
  const headerEyebrow = safeContext?.safeLine
    ? `NBA · ${safeContext.safeLine}`
    : "NBA · Playoff series";

  const dots = deriveSeriesDots({ seriesContext: series });

  const nextDot = dots.find((d) => d.state === "next" || d.state === "live");
  const nextGameNumber = nextDot?.number ?? null;
  const nextGame =
    series.nextGame && nextDot?.gameId === series.nextGame.id
      ? {
          id: series.nextGame.id,
          date: series.nextGame.date,
          awayCode: series.nextGame.away.abbreviation,
          homeCode: series.nextGame.home.abbreviation,
          broadcasts: series.nextGame.broadcasts ?? [],
          gameNumberLabel: nextGameNumber ? `Game ${nextGameNumber}` : "Next game",
        }
      : null;

  // Game rows — sorted by game number ascending.
  const rows: SeriesGameRow[] = [...series.games]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map<SeriesGameRow>((g, idx) => {
      const n = deriveGameNumber(g, idx);
      return {
        id: g.id,
        number: n,
        label: gameRowLabel(g, n),
        status: g.status,
        awayCode: g.away.abbreviation,
        homeCode: g.home.abbreviation,
        scoreLine:
          g.status === "upcoming" ? null : `${g.away.score} – ${g.home.score}`,
        href: `/game/${g.id}`,
      };
    });

  return {
    key: series.key,
    abbrA: series.abbrA,
    abbrB: series.abbrB,
    teamA: teamSlim(series.teamA),
    teamB: teamSlim(series.teamB),
    headerEyebrow,
    statusLabel: statusLabel(series),
    spoilerySummary: series.summary,
    safeStakeLine: buildSafeStake(series, nextGameNumber),
    spoileryStakeLine: buildSpoileryStake(series),
    dots,
    nextGame,
    games: rows,
  };
}

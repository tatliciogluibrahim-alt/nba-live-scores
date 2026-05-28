import type { Game, SeriesInfo, Team } from "../types";
import { getWinningTeam } from "./games";

/** ESPN sometimes shortens canonical team codes inside seriesSummary
 *  ("NY WINS SERIES" instead of "NYK WINS SERIES"). The API boundary in
 *  /api/live-scores/route.ts already canonicalises these, but a defensive
 *  alias map here keeps the parser correct if any caller passes through
 *  an un-canonicalised string (snapshots, persisted memory, etc.).
 *
 *  Keep in sync with TEAM_ABBR_ALIASES in app/api/live-scores/route.ts. */
const SUMMARY_ALIASES: Record<string, string> = {
  NY: "NYK",
};

function canonicalize(code: string): string {
  const upper = code.toUpperCase();
  return SUMMARY_ALIASES[upper] ?? upper;
}

function teamMatches(parsed: string, abbr: string): boolean {
  const a = canonicalize(parsed);
  const b = canonicalize(abbr);
  return a === b;
}

/** Parse the authoritative series record from ESPN's seriesSummary string.
 * Handles: "PHI WINS SERIES 4-3", "DEN LEADS SERIES 3-1", "SERIES TIED 2-2".
 *
 * Tricky case: when one team's abbreviation is a substring of another
 * (NY vs NYK) or when ESPN's summary uses the short code while the
 * Game.team objects carry the canonical code. We canonicalise both sides
 * before comparing so the parser is robust to either format. */
export function parseSeriesWins(
  summary: string,
  abbrA: string,
  abbrB: string
): { winsA: number; winsB: number } {
  const s = summary.toUpperCase();

  const winsMatch = s.match(/(\w+)\s+WINS?\s+SERIES\s+(\d+)-(\d+)/);
  if (winsMatch) {
    const winner = winsMatch[1];
    const hi = parseInt(winsMatch[2]);
    const lo = parseInt(winsMatch[3]);
    if (teamMatches(winner, abbrA)) return { winsA: hi, winsB: lo };
    if (teamMatches(winner, abbrB)) return { winsA: lo, winsB: hi };
    // Neither matched — fall through to score-based heuristic. This
    // should be vanishingly rare now that we canonicalise at the API.
    return hi > lo
      ? { winsA: hi, winsB: lo }
      : { winsA: lo, winsB: hi };
  }

  const leadsMatch = s.match(/(\w+)\s+LEADS?\s+SERIES\s+(\d+)-(\d+)/);
  if (leadsMatch) {
    const leader = leadsMatch[1];
    const hi = parseInt(leadsMatch[2]);
    const lo = parseInt(leadsMatch[3]);
    if (teamMatches(leader, abbrA)) return { winsA: hi, winsB: lo };
    if (teamMatches(leader, abbrB)) return { winsA: lo, winsB: hi };
    return { winsA: lo, winsB: hi };
  }

  const tiedMatch = s.match(/SERIES\s+TIED\s+(\d+)-(\d+)/);
  if (tiedMatch) {
    const n = parseInt(tiedMatch[1]);
    return { winsA: n, winsB: n };
  }

  return { winsA: 0, winsB: 0 };
}

function getSeriesContextText(games: Game[]) {
  return games
    .flatMap((game) => [
      game.seriesConference,
      game.seriesRound,
      game.gameContext,
      game.seriesSummary,
      game.matchup,
    ])
    .filter(Boolean)
    .join(" ");
}

function isBracketCandidateGame(game: Game) {
  if (
    !game.away.abbreviation ||
    !game.home.abbreviation ||
    game.away.abbreviation === "TBD" ||
    game.home.abbreviation === "TBD"
  ) {
    return false;
  }

  const text = getSeriesContextText([game]).toLowerCase();

  return Boolean(
    game.seriesRound ||
      game.seriesConference ||
      game.seriesSummary ||
      /playoff|series|first round|1st round|second round|2nd round|semifinals|semi-finals|conference finals|conf finals|nba finals|game\s+[1-7]/i.test(
        text
      )
  );
}

function inferSeriesConference(games: Game[]) {
  const explicit = games.find((game) => game.seriesConference)?.seriesConference;
  if (explicit) return explicit;

  const text = getSeriesContextText(games).toLowerCase();
  if (/nba finals/.test(text)) return "Finals";
  if (/(eastern|east)\b/.test(text)) return "East";
  if (/(western|west)\b/.test(text)) return "West";

  return "";
}

function inferSeriesRound(games: Game[]) {
  const explicit = games.find((game) => game.seriesRound)?.seriesRound;
  if (explicit) return explicit;

  const text = getSeriesContextText(games).toLowerCase();
  if (/nba finals/.test(text)) return "NBA Finals";
  if (/conference finals|conf finals|east finals|west finals/.test(text)) return "Conf Finals";
  if (/semifinals|semi-finals|second round|2nd round/.test(text)) return "Second Round";
  if (/first round|1st round/.test(text)) return "First Round";

  return "Playoff Series";
}

export function getRoundRank(round: string) {
  if (round === "First Round") return 0;
  if (round === "Second Round") return 1;
  if (round === "Conf Finals") return 2;
  if (round === "NBA Finals") return 3;
  return 4;
}

export function getSeriesUrgencyRank(series: SeriesInfo) {
  if (series.status === "live") return 0;
  if (series.isGame7) return 1;
  if (series.status === "upcoming") return 2;
  return 3;
}

function deriveWinsFromFinalGames(games: Game[], abbrA: string, abbrB: string) {
  return games.reduce(
    (wins, game) => {
      if (game.status !== "final") return wins;

      const winner = getWinningTeam(game);
      if (!winner) return wins;

      if (winner.abbreviation === abbrA) wins.winsA += 1;
      if (winner.abbreviation === abbrB) wins.winsB += 1;

      return wins;
    },
    { winsA: 0, winsB: 0 }
  );
}

export function prettifySeriesSummary(summary: string) {
  const compact = summary.replace(/\s+/g, " ").trim();
  const upper = compact.toUpperCase();

  const winnerMatch = upper.match(/(\w+)\s+WINS?\s+SERIES\s+(\d+)-(\d+)/);
  if (winnerMatch) {
    return `${winnerMatch[1]} wins series ${winnerMatch[2]}-${winnerMatch[3]}`;
  }

  const leaderMatch = upper.match(/(\w+)\s+LEADS?\s+SERIES\s+(\d+)-(\d+)/);
  if (leaderMatch) {
    return `${leaderMatch[1]} leads series ${leaderMatch[2]}-${leaderMatch[3]}`;
  }

  const tiedMatch = upper.match(/SERIES\s+TIED\s+(\d+)-(\d+)/);
  if (tiedMatch) return `Series tied ${tiedMatch[1]}-${tiedMatch[2]}`;

  return compact;
}

export function getSeriesRecord(series: SeriesInfo) {
  const winsA = series.teamA.wins;
  const winsB = series.teamB.wins;

  if (winsA === 0 && winsB === 0 && series.summary) {
    return prettifySeriesSummary(series.summary);
  }

  if (winsA === winsB) return `Series tied ${winsA}-${winsB}`;

  const leader = winsA > winsB ? series.teamA : series.teamB;
  const high = Math.max(winsA, winsB);
  const low = Math.min(winsA, winsB);

  if (high === 4) return `${leader.abbreviation} wins series ${high}-${low}`;

  return `${leader.abbreviation} leads series ${high}-${low}`;
}

function getSeriesRoundLabel(round: string) {
  if (round === "Second Round") return "Semifinals";
  if (round === "Conf Finals") return "Conference Finals";
  if (round === "NBA Finals") return "NBA Finals";
  if (round === "First Round") return "First Round";
  return "Playoff Series";
}

export function getSeriesLabel(series: SeriesInfo) {
  if (series.round === "NBA Finals" || series.conference === "Finals") {
    return "NBA Finals";
  }

  if (series.conference === "East" || series.conference === "West") {
    if (series.round === "Conf Finals") return `${series.conference} Finals`;
    if (series.round === "Second Round") return `${series.conference} Semifinals`;
    if (series.round === "First Round") return `${series.conference} First Round`;
    return `${series.conference} Series`;
  }

  return getSeriesRoundLabel(series.round);
}

export function getSeriesGameLabel(series: SeriesInfo) {
  const context =
    series.nextGame?.gameContext ||
    series.latestGame?.gameContext ||
    series.games.find((game) => game.gameContext)?.gameContext ||
    "";
  const match = context.match(/game\s+[1-7]/i);

  return match ? match[0].replace(/^game/i, "Game") : "";
}

export function getSeriesStatusLabel(series: SeriesInfo) {
  if (series.status === "live") return "Live";
  if (series.nextGame?.status === "upcoming") return "Upcoming";
  if (series.latestGame?.status === "final") return "Final";
  if (series.status === "complete") return "Final";
  return "Upcoming";
}

export function buildBracketSeries(allGames: Game[]): SeriesInfo[] {
  const playoffGames = allGames.filter(isBracketCandidateGame);
  if (!playoffGames.length) return [];

  const seriesMap = new Map<string, Game[]>();
  playoffGames.forEach((game) => {
    const [a, b] = [game.away.abbreviation, game.home.abbreviation].sort();
    const key = `${a}-${b}`;
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push(game);
  });

  const series: SeriesInfo[] = Array.from(seriesMap.entries()).map(
    ([key, sg]) => {
      const [abbrA, abbrB] = key.split("-");
      const sortedGames = [...sg].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const latestGame = [...sortedGames].reverse()[0];

      const getTeamData = (abbr: string): Team => {
        for (const g of sortedGames) {
          if (g.away.abbreviation === abbr) return g.away;
          if (g.home.abbreviation === abbr) return g.home;
        }
        return sortedGames[0].away;
      };

      const withSummary = sortedGames
        .filter((g) => g.seriesSummary)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const summary = withSummary[0]?.seriesSummary ?? "";

      const parsedWins = summary
        ? parseSeriesWins(summary, abbrA, abbrB)
        : { winsA: 0, winsB: 0 };
      const fallbackWins = deriveWinsFromFinalGames(sortedGames, abbrA, abbrB);
      const hasParsedRecord = parsedWins.winsA > 0 || parsedWins.winsB > 0;
      const { winsA, winsB } = hasParsedRecord ? parsedWins : fallbackWins;

      const conference = inferSeriesConference(sortedGames);
      const round = inferSeriesRound(sortedGames);

      const liveGame = sortedGames.find((g) => g.status === "live");
      const upcomingGames = sortedGames
        .filter((g) => g.status === "upcoming")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const nextGame = liveGame ?? upcomingGames[0];
      const status: SeriesInfo["status"] = liveGame
        ? "live"
        : upcomingGames.length > 0
          ? "upcoming"
          : "complete";

      const isGame7 = status !== "complete" && winsA === 3 && winsB === 3;

      return {
        key,
        abbrA,
        abbrB,
        teamA: { ...getTeamData(abbrA), wins: winsA },
        teamB: { ...getTeamData(abbrB), wins: winsB },
        conference,
        round,
        summary,
        status,
        isGame7,
        nextGame,
        latestGame,
        source: sortedGames.some((game) => game.seriesRound || game.seriesConference)
          ? "api"
          : "inferred",
        games: sortedGames,
      };
    }
  );

  return series.sort((a, b) => {
    const roundDifference = getRoundRank(a.round) - getRoundRank(b.round);
    if (roundDifference !== 0) return roundDifference;

    const conferenceDifference = a.conference.localeCompare(b.conference);
    if (conferenceDifference !== 0) return conferenceDifference;

    return getSeriesUrgencyRank(a) - getSeriesUrgencyRank(b);
  });
}

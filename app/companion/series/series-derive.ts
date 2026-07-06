import type { Game, SeriesInfo } from "../../nba/types";
import { getGameNumberFromText } from "../../nba/lib/moment-intelligence";
import type { SeriesDot, SeriesDotState } from "./series-data";

type CurrentGameInput = {
  currentGame: Game;
  allGames?: ReadonlyArray<Game>;
};

type SeriesContextInput = {
  seriesContext: SeriesInfo;
};

type DeriveSeriesDotsInput = CurrentGameInput | SeriesContextInput;

export function deriveSeriesDots(input: DeriveSeriesDotsInput): SeriesDot[] {
  if ("seriesContext" in input) {
    return deriveFromSeriesContext(input.seriesContext);
  }

  return deriveFromCurrentGame(input.currentGame, input.allGames ?? []);
}

function parseGameNumber(game: Game): number | null {
  return getGameNumberFromText(
    [game.gameContext, game.seriesSummary, game.seriesRound]
      .filter(Boolean)
      .join(" ")
  );
}

function deriveGameNumber(game: Game, index: number): number {
  return parseGameNumber(game) ?? index + 1;
}

function sameMatchup(game: Game, awayCode: string, homeCode: string): boolean {
  const teams = [game.away.abbreviation, game.home.abbreviation];
  return teams.includes(awayCode) && teams.includes(homeCode);
}

function winnerCode(game: Game): string | undefined {
  if (game.status !== "final" || game.away.score === game.home.score) {
    return undefined;
  }

  return game.away.score > game.home.score
    ? game.away.abbreviation
    : game.home.abbreviation;
}

function scoreLine(game: Game): string | undefined {
  if (game.status === "upcoming") return undefined;
  return `${game.away.score} – ${game.home.score}`;
}

function gameDot(
  game: Game,
  number: number,
  state: SeriesDotState,
  isClincher = false
): SeriesDot {
  return {
    number,
    state,
    gameId: game.id,
    date: game.date,
    awayCode: game.away.abbreviation,
    homeCode: game.home.abbreviation,
    scoreLine: scoreLine(game),
    winnerCode: winnerCode(game),
    isClincher,
  };
}

function deriveFromCurrentGame(
  game: Game,
  allGames: ReadonlyArray<Game>
): SeriesDot[] {
  const gameNumber = parseGameNumber(game);
  if (!gameNumber) return [];

  const awayCode = game.away.abbreviation;
  const homeCode = game.home.abbreviation;
  const knownDots = new Map<number, SeriesDot>();

  for (const candidate of allGames) {
    if (!sameMatchup(candidate, awayCode, homeCode)) continue;

    const n = parseGameNumber(candidate);
    if (!n || n < 1 || n > 7) continue;

    const state: SeriesDotState =
      candidate.status === "live"
        ? "live"
        : candidate.status === "upcoming"
          ? "scheduled"
          : "played";

    knownDots.set(n, gameDot(candidate, n, state));
  }

  const currentState: SeriesDotState =
    game.status === "live"
      ? "live"
      : game.status === "upcoming"
        ? "next"
        : "played";
  knownDots.set(gameNumber, gameDot(game, gameNumber, currentState));

  if (currentState === "played") {
    const next = Array.from(knownDots.values())
      .filter((dot) => dot.state === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime()
      )[0];
    if (next) {
      knownDots.set(next.number, { ...next, state: "next" });
    }
  }

  const scoreMatch = game.seriesSummary?.match(/(\d+)-(\d+)/);
  const winsA = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  const winsB = scoreMatch ? parseInt(scoreMatch[2], 10) : 0;
  const maxWins = Math.max(winsA, winsB);
  const seriesOver = maxWins >= 4;
  const guaranteedAfterCurrent = seriesOver
    ? 0
    : Math.max(0, 4 - maxWins - 1);

  return Array.from({ length: 7 }, (_, i): SeriesDot => {
    const n = i + 1;
    const known = knownDots.get(n);
    if (known) return known;

    let state: SeriesDotState;
    if (seriesOver) {
      state = n <= winsA + winsB ? "played" : "tbd";
    } else if (n < gameNumber) {
      state = "played";
    } else {
      const offset = n - gameNumber;
      state = offset <= guaranteedAfterCurrent ? "scheduled" : "if-necessary";
    }

    return { number: n, state };
  });
}

function deriveFromSeriesContext(series: SeriesInfo): SeriesDot[] {
  const games = [...series.games].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dots = new Map<number, SeriesDot>();

  games.forEach((game, index) => {
    const n = deriveGameNumber(game, index);
    if (n < 1 || n > 7) return;

    const state: SeriesDotState =
      game.status === "live"
        ? "live"
        : game.status === "final"
          ? "played"
          : "scheduled";
    const isClincher = Boolean(
      game.seriesSummary?.match(/(\w+)\s+WINS?\s+SERIES\s+(\d+)-(\d+)/i)
    );

    dots.set(n, gameDot(game, n, state, game.status === "final" && isClincher));
  });

  const upcomingSorted = Array.from(dots.values())
    .filter((dot) => dot.state === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime()
    );
  const next = upcomingSorted[0];
  if (next) {
    dots.set(next.number, { ...next, state: "next" });
  }

  const result: SeriesDot[] = [];
  const isComplete = series.teamA.wins === 4 || series.teamB.wins === 4;
  const totalPlayed = series.teamA.wins + series.teamB.wins;

  for (let i = 1; i <= 7; i += 1) {
    const dot = dots.get(i);
    if (dot) {
      result.push(dot);
      continue;
    }

    // Games 1-4 are guaranteed in a best-of-7 — they can never be
    // "if necessary" no matter how few have been played (audit C5c: a
    // 1-1 series was dashing game 4).
    const ifNecessary =
      i > 4 && (isComplete ? i > totalPlayed : i > totalPlayed + 1);
    result.push({
      number: i,
      state: ifNecessary ? "if-necessary" : "tbd",
    });
  }

  return result;
}

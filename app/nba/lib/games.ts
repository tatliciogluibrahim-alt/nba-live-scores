import type { FavoriteTeamOption, Game, GameFilter, GameSection } from "../types";
import {
  formatGameDateTime,
  formatGameTime,
  getLocalDateKey,
  getScoreboardToday,
  isSameScoreboardDay,
  isTomorrow,
} from "./time";

export function gameIncludesTeam(game: Game, favoriteTeamAbbr: string | null) {
  if (!favoriteTeamAbbr) return false;

  return (
    game.away.abbreviation === favoriteTeamAbbr ||
    game.home.abbreviation === favoriteTeamAbbr
  );
}

export function getAvailableTeams(games: Game[]) {
  const teamsByAbbr = new Map<string, FavoriteTeamOption>();

  games.forEach((game) => {
    [game.away, game.home].forEach((team) => {
      if (!team.abbreviation || team.abbreviation === "TBD") return;

      teamsByAbbr.set(team.abbreviation, {
        abbreviation: team.abbreviation,
        name: team.name,
      });
    });
  });

  return Array.from(teamsByAbbr.values()).sort((a, b) =>
    a.abbreviation.localeCompare(b.abbreviation)
  );
}

export function getSectionTitle(date: string) {
  const gameDate = new Date(date);
  const scoreboardToday = getScoreboardToday();

  if (isSameScoreboardDay(gameDate, scoreboardToday)) return "Today";
  if (isTomorrow(gameDate)) return "Tomorrow";

  return gameDate.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function getTeamEdgeLabel(game: Game, side: "away" | "home") {
  if (game.status === "upcoming") return null;

  const teamScore = game[side].score;
  const otherSide = side === "away" ? "home" : "away";
  const otherScore = game[otherSide].score;

  if (teamScore <= otherScore) return null;

  return game.status === "final" ? "WON" : "LEAD";
}

export function getWinningSide(game: Game) {
  if (game.status === "upcoming") return null;
  if (game.away.score > game.home.score) return "away";
  if (game.home.score > game.away.score) return "home";
  return null;
}

export function getWinningTeam(game: Game) {
  const winningSide = getWinningSide(game);
  if (!winningSide) return null;

  return game[winningSide];
}

export function getFinalSummary(game: Game) {
  if (game.status !== "final") return "";

  const winner = getWinningTeam(game);

  if (!winner) return "Final";

  return `${winner.abbreviation} won ${game.away.score}-${game.home.score}`;
}

export function getGameSubStatus(game: Game) {
  if (game.status === "live") return `Live now · ${game.statusText}`;
  if (game.status === "final") return getFinalSummary(game);

  const gameDate = new Date(game.date);
  const now = new Date();
  const diffMs = gameDate.getTime() - now.getTime();

  if (diffMs <= 0) return "Starting soon";

  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(minutes / 60);

  if (minutes < 60) return `Starts in ${minutes} min`;
  if (hours < 12) return `Starts in ${hours} ${hours === 1 ? "hr" : "hrs"}`;
  if (isSameScoreboardDay(gameDate, getScoreboardToday())) return "Starts tonight";
  if (isTomorrow(gameDate)) return "Tomorrow";

  return "Upcoming";
}

export function sortGamesForDisplay(
  gamesToSort: Game[],
  favoriteTeamAbbr: string | null
) {
  const statusRank = {
    live: 0,
    upcoming: 1,
    final: 2,
  };

  return [...gamesToSort].sort((a, b) => {
    const aIsFavorite = gameIncludesTeam(a, favoriteTeamAbbr);
    const bIsFavorite = gameIncludesTeam(b, favoriteTeamAbbr);

    if (aIsFavorite !== bIsFavorite) return aIsFavorite ? -1 : 1;

    const statusDifference = statusRank[a.status] - statusRank[b.status];

    if (statusDifference !== 0) return statusDifference;

    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();

    if (a.status === "live" || a.status === "upcoming") return aTime - bTime;

    return bTime - aTime;
  });
}

export function groupByDay(gamesToGroup: Game[], eyebrow?: string): GameSection[] {
  const groups = new Map<string, Game[]>();

  gamesToGroup.forEach((game) => {
    const key = getLocalDateKey(game.date);
    const existingGames = groups.get(key);

    if (existingGames) {
      existingGames.push(game);
    } else {
      groups.set(key, [game]);
    }
  });

  return Array.from(groups.values()).map((sectionGames) => ({
    title: getSectionTitle(sectionGames[0].date),
    eyebrow,
    games: sectionGames,
  }));
}

export function buildSections(
  gamesToSection: Game[],
  activeFilter: GameFilter
): GameSection[] {
  if (activeFilter === "live") {
    return gamesToSection.length
      ? [{ title: "Live Now", eyebrow: "Real-time scores", games: gamesToSection }]
      : [];
  }

  if (activeFilter === "upcoming") {
    return groupByDay(gamesToSection, "Upcoming games");
  }

  if (activeFilter === "final") {
    return groupByDay(gamesToSection, "Final scores");
  }

  if (activeFilter === "my-team") {
    return groupByDay(gamesToSection, "My team");
  }

  const liveGames = gamesToSection.filter((game) => game.status === "live");
  const upcomingGames = gamesToSection.filter((game) => game.status === "upcoming");
  const finalGames = gamesToSection.filter((game) => game.status === "final");

  return [
    ...(liveGames.length
      ? [{ title: "Live Now", eyebrow: "Real-time scores", games: liveGames }]
      : []),
    ...groupByDay(upcomingGames, "Upcoming games"),
    ...(finalGames.length
      ? [{ title: "Earlier This Week", eyebrow: "Final scores", games: finalGames }]
      : []),
  ];
}

export function getNextUpcomingGame(games: Game[]) {
  let nextGame: Game | undefined;
  let nextTime = Infinity;

  games.forEach((game) => {
    if (game.status !== "upcoming") return;

    const gameTime = new Date(game.date).getTime();

    if (gameTime < nextTime) {
      nextTime = gameTime;
      nextGame = game;
    }
  });

  return nextGame;
}

export function getNextFavoriteGame({
  games,
  favoriteTeamAbbr,
  lastUpdatedAt,
}: {
  games: Game[];
  favoriteTeamAbbr: string | null;
  lastUpdatedAt: Date | null;
}) {
  let nextGame: Game | undefined;
  let nextTime = Infinity;
  const currentTime = lastUpdatedAt?.getTime() ?? 0;

  games.forEach((game) => {
    if (!gameIncludesTeam(game, favoriteTeamAbbr)) return;

    const gameTime = new Date(game.date).getTime();

    if (gameTime > currentTime && gameTime < nextTime) {
      nextTime = gameTime;
      nextGame = game;
    }
  });

  return nextGame;
}

export function formatEmptyStateNextGame(game: Game) {
  return `${formatGameTime(game.date)} · ${game.matchup}`;
}

export function formatEmptyStateFavoriteGame(game: Game) {
  return `${formatGameDateTime(game.date)} · ${game.matchup}`;
}

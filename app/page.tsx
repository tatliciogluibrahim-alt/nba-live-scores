"use client";

import { useEffect, useMemo, useState } from "react";

type GameStatus = "live" | "upcoming" | "final";
type GameFilter = "all" | "my-team" | GameStatus;
type ViewScope = "today" | "week";

type Team = {
  name: string;
  abbreviation: string;
  score: number;
  logo: string;
};

type FavoriteTeamOption = {
  name: string;
  abbreviation: string;
};

type Game = {
  id: string;
  date: string;
  status: GameStatus;
  statusText: string;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  home: Team;
  away: Team;
};

type GameSection = {
  title: string;
  eyebrow?: string;
  games: Game[];
};

const FAVORITE_TEAM_STORAGE_KEY = "no-noise-favorite-team";
const OLD_FOLLOWED_TEAM_STORAGE_KEY = "no-noise-followed-team";

function formatGameDateTime(date: string) {
  const gameDate = new Date(date);

  return `${gameDate.toLocaleDateString([], {
    weekday: "short",
  })} • ${gameDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatGameTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLastUpdated(updatedAt: Date | null) {
  if (!updatedAt) return "Updating scores";

  const diffMs = Date.now() - updatedAt.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes === 1) return "Updated 1 min ago";

  return `Updated ${diffMinutes} min ago`;
}

function getLocalDateKey(date: string) {
  const gameDate = new Date(date);
  const year = gameDate.getFullYear();
  const month = String(gameDate.getMonth() + 1).padStart(2, "0");
  const day = String(gameDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getScoreboardToday() {
  const now = new Date();
  const scoreboardToday = new Date(now);

  if (now.getHours() < 5) {
    scoreboardToday.setDate(scoreboardToday.getDate() - 1);
  }

  return scoreboardToday;
}

function isSameScoreboardDay(gameDate: Date, scoreboardDate: Date) {
  return (
    gameDate.getFullYear() === scoreboardDate.getFullYear() &&
    gameDate.getMonth() === scoreboardDate.getMonth() &&
    gameDate.getDate() === scoreboardDate.getDate()
  );
}

function isTomorrow(date: Date) {
  const scoreboardTomorrow = getScoreboardToday();
  scoreboardTomorrow.setDate(scoreboardTomorrow.getDate() + 1);

  return isSameScoreboardDay(date, scoreboardTomorrow);
}

function gameIncludesTeam(game: Game, favoriteTeamAbbr: string | null) {
  if (!favoriteTeamAbbr) return false;

  return (
    game.away.abbreviation === favoriteTeamAbbr ||
    game.home.abbreviation === favoriteTeamAbbr
  );
}

function getAvailableTeams(games: Game[]) {
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

function getSectionTitle(date: string) {
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

function getStatusClasses(status: Game["status"]) {
  if (status === "live") return "bg-orange-100 text-orange-800 ring-orange-200";
  if (status === "final") return "bg-slate-200 text-slate-700 ring-slate-300";
  return "bg-blue-100 text-blue-800 ring-blue-200";
}

function getCardAccentClasses(status: Game["status"]) {
  if (status === "live") return "border-t-[3px] border-orange-500";
  if (status === "final") return "border-t-[3px] border-emerald-600";
  return "border-t-[3px] border-blue-500";
}

function getStatusLabel(status: Game["status"]) {
  if (status === "live") return "LIVE";
  if (status === "final") return "FINAL";
  return "UPCOMING";
}

function getTeamEdgeLabel(game: Game, side: "away" | "home") {
  if (game.status === "upcoming") return null;

  const teamScore = game[side].score;
  const otherSide = side === "away" ? "home" : "away";
  const otherScore = game[otherSide].score;

  if (teamScore <= otherScore) return null;

  return game.status === "final" ? "WON" : "LEAD";
}

function getTeamEdgeClasses(game: Game) {
  if (game.status === "final") return "bg-emerald-600 text-white";
  return "bg-orange-500 text-white";
}

function getWinningTeam(game: Game) {
  if (game.status === "upcoming") return null;

  if (game.away.score > game.home.score) return game.away;
  if (game.home.score > game.away.score) return game.home;

  return null;
}

function getFinalSummary(game: Game) {
  if (game.status !== "final") return "";

  const winner = getWinningTeam(game);

  if (!winner) return "Final";

  return `${winner.abbreviation} won ${game.away.score}-${game.home.score}`;
}

function getGameSubStatus(game: Game) {
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

function sortGamesForDisplay(gamesToSort: Game[], favoriteTeamAbbr: string | null) {
  const statusRank = {
    live: 0,
    upcoming: 1,
    final: 2,
  };

  return [...gamesToSort].sort((a, b) => {
    const statusDifference = statusRank[a.status] - statusRank[b.status];

    if (statusDifference !== 0) return statusDifference;

    const aIsFavorite = gameIncludesTeam(a, favoriteTeamAbbr);
    const bIsFavorite = gameIncludesTeam(b, favoriteTeamAbbr);

    if (aIsFavorite !== bIsFavorite) return aIsFavorite ? -1 : 1;

    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();

    if (a.status === "live" || a.status === "upcoming") return aTime - bTime;

    return bTime - aTime;
  });
}

function groupByDay(gamesToGroup: Game[], eyebrow?: string): GameSection[] {
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

function buildSections(
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

function TeamLogo({ team }: { team: Team }) {
  if (!team.logo) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600 sm:h-9 sm:w-9">
        {team.abbreviation}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-orange-100 sm:h-9 sm:w-9">
      <img
        src={team.logo}
        alt={`${team.name} logo`}
        className="h-6 w-6 object-contain"
        loading="lazy"
      />
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 rounded-full px-2.5 py-1.5 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-wide transition sm:px-3 sm:text-xs ${
        active
          ? "bg-orange-500 text-white shadow-md shadow-orange-950/20"
          : "bg-white/10 text-white/75 ring-1 ring-white/10 hover:bg-white/15"
      } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-white/10" : ""}`}
    >
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
        {typeof count === "number" && (
          <span className={active ? "text-white/90" : "text-white/45"}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

function FavoriteTeamSelect({
  teams,
  favoriteTeamAbbr,
  onChange,
}: {
  teams: FavoriteTeamOption[];
  favoriteTeamAbbr: string | null;
  onChange: (teamAbbreviation: string | null) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 py-1.5 pl-2.5 pr-2 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-wide text-white/75 ring-1 ring-white/10 sm:text-xs">
      <span className="text-white/45">Team:</span>

      <span className="relative">
        <select
          value={favoriteTeamAbbr || ""}
          onChange={(event) => onChange(event.target.value || null)}
          className="max-w-[8.5rem] appearance-none bg-transparent py-0 pl-0 pr-5 font-[family-name:var(--font-display)] font-black uppercase text-white outline-none sm:max-w-[11rem]"
          aria-label="Favorite team"
        >
          <option value="">Pick</option>
          {teams.map((team) => (
            <option key={team.abbreviation} value={team.abbreviation}>
              {team.abbreviation}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-white/45">
          ▾
        </span>
      </span>
    </label>
  );
}

function TeamLine({
  game,
  side,
  favoriteTeamAbbr,
}: {
  game: Game;
  side: "away" | "home";
  favoriteTeamAbbr: string | null;
}) {
  const team = game[side];
  const showScore = game.status !== "upcoming";
  const edgeLabel = getTeamEdgeLabel(game, side);
  const isFavoriteTeam = favoriteTeamAbbr === team.abbreviation;

  return (
    <div className="flex items-center justify-between py-2.5 sm:py-3">
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo team={team} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-black tracking-tight text-slate-950 sm:text-lg">
              {team.abbreviation}
            </p>

            {isFavoriteTeam && (
              <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-wide text-orange-700">
                MY TEAM
              </span>
            )}

            {edgeLabel && (
              <span
                className={`rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[10px] font-black uppercase tracking-wide ${getTeamEdgeClasses(
                  game
                )}`}
              >
                {edgeLabel}
              </span>
            )}
          </div>

          <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
            {team.name}
          </p>
        </div>
      </div>

      <div className="ml-4 text-2xl font-black tabular-nums tracking-tight text-slate-950">
        {showScore ? team.score : "–"}
      </div>
    </div>
  );
}

function PlayoffBand({ game }: { game: Game }) {
  const finalSummary = getFinalSummary(game);

  if (!game.gameContext && !game.seriesSummary && !finalSummary) return null;

  return (
    <div className="mt-3 rounded-[1.3rem] bg-[#07111f] px-4 py-3 text-white ring-1 ring-white/10">
      {game.status === "final" && finalSummary && (
        <p className="font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-emerald-300">
          {finalSummary}
        </p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {game.gameContext && (
          <p className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-orange-300">
            {game.gameContext}
          </p>
        )}

        {game.seriesSummary && (
          <p className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-white">
            {game.seriesSummary}
          </p>
        )}
      </div>
    </div>
  );
}

function GameCard({
  game,
  favoriteTeamAbbr,
}: {
  game: Game;
  favoriteTeamAbbr: string | null;
}) {
  return (
    <article
      className={`rounded-[1.6rem] bg-[#fffaf2] p-3.5 text-slate-950 shadow-xl shadow-black/15 ring-1 ring-orange-100/70 sm:rounded-[1.65rem] sm:p-4 ${getCardAccentClasses(
        game.status
      )}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-[family-name:var(--font-display)] text-[11px] font-black uppercase tracking-wide ring-1 ${getStatusClasses(
              game.status
            )}`}
          >
            {game.status === "live" && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-600" />
            )}
            {getStatusLabel(game.status)}
          </div>

          <p className="mt-2 text-sm font-bold text-slate-500">
            {getGameSubStatus(game)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-[family-name:var(--font-display)] text-[1.6rem] font-black uppercase leading-none tracking-tight text-slate-950 sm:text-xl">
            {game.status === "live"
              ? game.statusText
              : formatGameDateTime(game.date)}
          </p>

          <p className="mt-1 font-[family-name:var(--font-display)] text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {game.matchup}
          </p>
        </div>
      </div>

      <div className="rounded-[1.45rem] bg-white/90 px-4 py-2 ring-1 ring-orange-100/80">
        <TeamLine game={game} side="away" favoriteTeamAbbr={favoriteTeamAbbr} />
        <div className="h-px bg-orange-100/70" />
        <TeamLine game={game} side="home" favoriteTeamAbbr={favoriteTeamAbbr} />
      </div>

      <PlayoffBand game={game} />
    </article>
  );
}

function EmptyState({
  activeFilter,
  viewScope,
  nextGame,
}: {
  activeFilter: GameFilter;
  viewScope: ViewScope;
  nextGame?: Game;
}) {
  if (activeFilter === "live") {
    return (
      <section className="rounded-[1.75rem] bg-[#fffaf2] p-8 text-center text-slate-950 shadow-xl shadow-black/20 ring-1 ring-orange-100/70">
        <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
          No live games right now
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {nextGame
            ? `Next tipoff: ${formatGameTime(nextGame.date)} · ${nextGame.matchup}`
            : "Check back soon for live scores."}
        </p>
      </section>
    );
  }

  if (activeFilter === "my-team") {
    return (
      <section className="rounded-[1.75rem] bg-[#fffaf2] p-8 text-center text-slate-950 shadow-xl shadow-black/20 ring-1 ring-orange-100/70">
        <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
          No team games found
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {viewScope === "today"
            ? "Try switching to Week or pick a different team."
            : "Try picking a different team."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] bg-[#fffaf2] p-8 text-center text-slate-950 shadow-xl shadow-black/20 ring-1 ring-orange-100/70">
      <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
        No games found
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {viewScope === "today"
          ? "Try switching to Week to see the full schedule."
          : "Try switching filters to see more games."}
      </p>
    </section>
  );
}

function BrandLockup() {
  return (
    <div className="flex items-center gap-3 lg:justify-end">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[#07111f] shadow-lg shadow-black/20 ring-1 ring-white/10 sm:h-14 sm:w-14">
        <img
          src="/favicon.svg"
          alt="No Noise Scores logo"
          className="h-7 w-7 sm:h-8 sm:w-8"
        />
      </div>

      <p className="font-[family-name:var(--font-display)] text-[1.45rem] font-black uppercase leading-[0.88] tracking-tight text-orange-500 sm:text-[1.6rem] lg:text-[1.9rem]">
        No Noise
        <br />
        Scores
      </p>
    </div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeFilter, setActiveFilter] = useState<GameFilter>("all");
  const [viewScope, setViewScope] = useState<ViewScope>("today");
  const [favoriteTeamAbbr, setFavoriteTeamAbbr] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const storedFavoriteTeam =
      localStorage.getItem(FAVORITE_TEAM_STORAGE_KEY) ||
      localStorage.getItem(OLD_FOLLOWED_TEAM_STORAGE_KEY);

    if (storedFavoriteTeam) {
      setFavoriteTeamAbbr(storedFavoriteTeam);
      localStorage.setItem(FAVORITE_TEAM_STORAGE_KEY, storedFavoriteTeam);
      localStorage.removeItem(OLD_FOLLOWED_TEAM_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let isFetching = false;
    let controller: AbortController | null = null;

    async function fetchGames() {
      if (isFetching) return;

      isFetching = true;

      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await fetch("/api/live-scores", {
          signal: requestController.signal,
        });

        if (!response.ok) throw new Error("Could not fetch games");

        const data = await response.json();

        if (isMounted) {
          setGames(data.games);
          setLastUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : new Date());
        }
      } catch {
        if (isMounted && !requestController.signal.aborted) {
          setGames([]);
        }
      } finally {
        if (isMounted) {
          setHasLoadedOnce(true);
        }

        isFetching = false;
      }
    }

    fetchGames();

    const interval = setInterval(fetchGames, 30000);

    return () => {
      isMounted = false;
      controller?.abort();
      clearInterval(interval);
    };
  }, []);

  function handleFavoriteTeamChange(teamAbbreviation: string | null) {
    setFavoriteTeamAbbr(teamAbbreviation);

    if (teamAbbreviation) {
      localStorage.setItem(FAVORITE_TEAM_STORAGE_KEY, teamAbbreviation);
    } else {
      localStorage.removeItem(FAVORITE_TEAM_STORAGE_KEY);

      if (activeFilter === "my-team") {
        setActiveFilter("all");
      }
    }
  }

  const availableTeams = useMemo(() => {
    return getAvailableTeams(games);
  }, [games]);

  const todayGames = useMemo(() => {
    const scoreboardToday = getScoreboardToday();

    return games.filter((game) =>
      isSameScoreboardDay(new Date(game.date), scoreboardToday)
    );
  }, [games]);

  const scopedGames = useMemo(() => {
    return viewScope === "today" ? todayGames : games;
  }, [games, todayGames, viewScope]);

  const filteredGames = useMemo(() => {
    const selectedGames = scopedGames.filter((game) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "my-team") return gameIncludesTeam(game, favoriteTeamAbbr);

      return game.status === activeFilter;
    });

    return sortGamesForDisplay(selectedGames, favoriteTeamAbbr);
  }, [scopedGames, activeFilter, favoriteTeamAbbr]);

  const sections = useMemo(() => {
    return buildSections(filteredGames, activeFilter);
  }, [filteredGames, activeFilter]);

  const counts = useMemo(() => {
    return scopedGames.reduce(
      (total, game) => {
        total.all += 1;
        total[game.status] += 1;

        if (gameIncludesTeam(game, favoriteTeamAbbr)) {
          total.myTeam += 1;
        }

        return total;
      },
      { all: 0, myTeam: 0, live: 0, upcoming: 0, final: 0 }
    );
  }, [scopedGames, favoriteTeamAbbr]);

  const nextUpcomingGame = useMemo(() => {
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
  }, [games]);

  const sponsorName = "Ibra-Heem";
  const sponsorUrl = "https://open.spotify.com/artist/1yNArQC2GYbKr3M7H7vpXo";

  return (
    <main className="min-h-screen bg-[#07111f] bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.15),transparent_30%)] px-4 pb-36 pt-4 text-white sm:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 overflow-hidden rounded-[1.65rem] bg-[#fff8ef] text-slate-950 shadow-2xl shadow-black/30 ring-1 ring-white/35 sm:mb-5 sm:rounded-[2rem]">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.11),transparent_34%),linear-gradient(135deg,#fffaf2,#fffefb_54%,#fff3e4)] p-5 sm:p-6 lg:p-7">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-[2.35rem] font-black uppercase leading-[0.92] tracking-tight text-slate-950 sm:text-6xl sm:leading-[0.9] lg:text-[5rem]">
                  NBA scores,
                  <br />
                  no noise.
                </h1>

                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-base font-medium leading-7 text-slate-500 sm:mt-4 sm:text-lg sm:leading-8">
                  <span>Sponsored by</span>
                  <a
                    href={sponsorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-700 underline decoration-orange-400 decoration-2 underline-offset-4 transition hover:text-orange-600"
                  >
                    {sponsorName}
                  </a>
                </p>

                <div className="mt-4 lg:hidden">
                  <BrandLockup />
                </div>
              </div>

              <div className="hidden lg:flex lg:justify-self-end">
                <BrandLockup />
              </div>
            </div>
          </div>
        </header>

        <div className="mb-10 -mx-4 px-4 pt-2 sm:mb-12 sm:-mx-6 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-[1.15rem] border border-white/10 bg-[#06101f]/92 px-3 py-2 shadow-xl shadow-black/25 backdrop-blur-xl sm:px-4">
            <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-1.5 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterPill
                  label="Today"
                  count={todayGames.length}
                  active={viewScope === "today"}
                  onClick={() => setViewScope("today")}
                />

                <FilterPill
                  label="Week"
                  count={games.length}
                  active={viewScope === "week"}
                  onClick={() => setViewScope("week")}
                />

                <FavoriteTeamSelect
                  teams={availableTeams}
                  favoriteTeamAbbr={favoriteTeamAbbr}
                  onChange={handleFavoriteTeamChange}
                />
              </div>

              <p className="order-last px-1 font-[family-name:var(--font-display)] text-[10px] font-black uppercase tracking-[0.18em] text-white/35 lg:order-none lg:mx-3 lg:shrink-0 lg:px-0 lg:text-right">
                {formatLastUpdated(lastUpdatedAt)}
              </p>

              <div className="flex gap-1.5 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-end">
                <FilterPill
                  label="All"
                  count={counts.all}
                  active={activeFilter === "all"}
                  onClick={() => setActiveFilter("all")}
                />

                <FilterPill
                  label="My Team"
                  count={counts.myTeam}
                  active={activeFilter === "my-team"}
                  disabled={!favoriteTeamAbbr}
                  onClick={() => setActiveFilter("my-team")}
                />

                <FilterPill
                  label="Live"
                  count={counts.live}
                  active={activeFilter === "live"}
                  onClick={() => setActiveFilter("live")}
                />

                <FilterPill
                  label="Upcoming"
                  count={counts.upcoming}
                  active={activeFilter === "upcoming"}
                  onClick={() => setActiveFilter("upcoming")}
                />

                <FilterPill
                  label="Final"
                  count={counts.final}
                  active={activeFilter === "final"}
                  onClick={() => setActiveFilter("final")}
                />
              </div>
            </div>
          </div>
        </div>

        {sections.length > 0 ? (
          <div className="space-y-7 sm:space-y-8">
            {sections.map((section) => (
              <section key={`${section.title}-${section.eyebrow || ""}`}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    {section.eyebrow && (
                      <p className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-[0.18em] text-orange-300">
                        {section.eyebrow}
                      </p>
                    )}

                    <h2 className="font-[family-name:var(--font-display)] text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl">
                      {section.title}
                    </h2>
                  </div>

                  <p className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-[0.18em] text-white/45">
                    {section.games.length}{" "}
                    {section.games.length === 1 ? "game" : "games"}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      favoriteTeamAbbr={favoriteTeamAbbr}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : !hasLoadedOnce ? (
          <section className="rounded-[1.75rem] bg-[#fffaf2] p-8 text-center text-slate-950 shadow-xl shadow-black/20 ring-1 ring-orange-100/70">
            <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
              Loading scores...
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pulling the latest scoreboard.
            </p>
          </section>
        ) : (
          <EmptyState
            activeFilter={activeFilter}
            viewScope={viewScope}
            nextGame={nextUpcomingGame}
          />
        )}
      </div>
    </main>
  );
}

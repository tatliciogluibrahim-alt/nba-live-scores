"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePushNotifications } from "@/lib/usePushNotifications";

type GameStatus = "live" | "upcoming" | "final";
type GameFilter = "all" | "my-team" | GameStatus;

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
  seriesConference: string;
  seriesRound: string;
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

function triggerLightHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(8);
  }
}

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

function formatCountdown(targetDate: string) {
  const diffMs = new Date(targetDate).getTime() - Date.now();

  if (diffMs <= 0) return "Starting soon";

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);

  if (totalMinutes < 5) {
    const totalSeconds = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `Starts in ${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `Starts in ${m}:${String(s).padStart(2, "0")}`;
  }

  if (totalMinutes < 60) return `In ${totalMinutes} min`;

  if (totalHours < 6) return `In ${totalHours} ${totalHours === 1 ? "hr" : "hrs"}`;

  return `Tonight · ${formatGameTime(targetDate)}`;
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
  if (status === "live") return "no-noise-live-card border-t-[3px] border-orange-500";
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

function getWinningSide(game: Game) {
  if (game.status === "upcoming") return null;
  if (game.away.score > game.home.score) return "away";
  if (game.home.score > game.away.score) return "home";
  return null;
}

function getWinningTeam(game: Game) {
  const winningSide = getWinningSide(game);
  if (!winningSide) return null;

  return game[winningSide];
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e8e0d4] sm:h-9 sm:w-9">
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
  compactLabel,
  count,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  compactLabel?: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        triggerLightHaptic();
        onClick();
      }}
      disabled={disabled}
      className={`flex h-7 w-auto shrink-0 min-w-0 overflow-visible items-center justify-center rounded-full px-2 text-[0.66rem] font-extrabold uppercase leading-none tracking-[0.01em] transition active:scale-[0.98] sm:h-8 sm:px-3 sm:text-[0.76rem] ${
        active
          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
          : "bg-[#e8e2d8] text-[#8a7a66] ring-1 ring-[#d4cdc0] hover:bg-[#ddd7cc]"
      } ${disabled ? "pointer-events-none opacity-20" : ""}`}
    >
      <span className="flex items-center justify-center gap-1">
        <span className="whitespace-nowrap">{compactLabel ?? label}</span>

        {typeof count === "number" && (
          <span
            className={`rounded-full px-1 py-0.5 text-[0.62rem] leading-none ${
              active ? "bg-white/20 text-white/90" : "bg-[#1a1208]/8 text-[#8a7a66]"
            }`}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

function FavoriteTeamPicker({
  teams,
  favoriteTeamAbbr,
  onChange,
}: {
  teams: FavoriteTeamOption[];
  favoriteTeamAbbr: string | null;
  onChange: (teamAbbreviation: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedTeam = teams.find((team) => team.abbreviation === favoriteTeamAbbr);

  return (
    <div
      className="relative min-w-0 shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => {
          triggerLightHaptic();
          setIsOpen((current) => !current);
        }}
        className="flex h-7 w-auto shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#e8e2d8] pl-2 pr-1.5 text-[0.66rem] font-extrabold uppercase leading-none tracking-[0.01em] text-[#8a7a66] ring-1 ring-[#d4cdc0] transition hover:bg-[#ddd7cc] active:scale-[0.98] sm:h-8 sm:pl-3 sm:text-[0.76rem]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-[#a89880]">Team</span>
        <span className="text-[#1a1208]">
          {selectedTeam ? selectedTeam.abbreviation : "Pick"}
        </span>
        <span className="text-[0.6rem] text-[#a89880]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-[1rem] border border-[#d4cdc0] bg-[#ffffff] py-1.5 shadow-xl shadow-black/10 ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              onChange(null);
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3 py-2 text-left font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-wide transition hover:bg-[#f0ece4] ${
              !favoriteTeamAbbr ? "text-orange-600" : "text-[#a89880]"
            }`}
          >
            Pick
          </button>

          <div className="max-h-64 overflow-y-auto [scrollbar-width:thin]">
            {teams.map((team) => (
              <button
                key={team.abbreviation}
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  onChange(team.abbreviation);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-[#f0ece4] ${
                  favoriteTeamAbbr === team.abbreviation
                    ? "text-orange-600"
                    : "text-[#1a1208]"
                }`}
              >
                <span className="font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-wide">
                  {team.abbreviation}
                </span>
                <span className="truncate text-xs font-semibold normal-case tracking-normal text-[#a89880]">
                  {team.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CountdownText({ date }: { date: string }) {
  const [label, setLabel] = useState("Starting soon");

  useEffect(() => {
    const updateCountdown = () => {
      setLabel(formatCountdown(date));
    };

    const getInterval = () =>
      new Date(date).getTime() - Date.now() < 300000 ? 1000 : 60000;

    const initialTimeout = setTimeout(updateCountdown, 0);
    const interval = setInterval(updateCountdown, getInterval());

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [date]);

  return <>{label}</>;
}

function ScoreBlock({
  score,
  isChanged,
}: {
  score: number;
  isChanged: boolean;
}) {
  return (
    <div
      className={`ml-4 min-w-[3.25rem] text-right text-[2.15rem] font-black leading-none tabular-nums tracking-tight text-[#1a1208] sm:text-[2.35rem] ${
        isChanged ? "no-noise-score-pop" : ""
      }`}
    >
      {score}
    </div>
  );
}

function TeamLine({
  game,
  side,
  favoriteTeamAbbr,
  changedScoreKeys,
}: {
  game: Game;
  side: "away" | "home";
  favoriteTeamAbbr: string | null;
  changedScoreKeys: Set<string>;
}) {
  const team = game[side];
  const showScore = game.status !== "upcoming";
  const edgeLabel = getTeamEdgeLabel(game, side);
  const winningSide = getWinningSide(game);
  const isWinner = winningSide === side;
  const isLoser = Boolean(winningSide && winningSide !== side);
  const isFavoriteTeam = favoriteTeamAbbr === team.abbreviation;
  const changedScoreKey = `${game.id}-${side}`;

  return (
    <div
      className={`-mx-1.5 flex items-center justify-between rounded-[0.9rem] px-1.5 py-2 transition sm:py-3 ${
        isWinner ? "bg-orange-50/70" : ""
      } ${isLoser ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <TeamLogo team={team} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.95rem] font-black tracking-tight text-[#1a1208] sm:text-lg">
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

          <p className="truncate text-[0.74rem] font-semibold leading-tight text-[#a89880] sm:text-sm">
            {team.name}
          </p>
        </div>
      </div>

      {showScore ? (
        <ScoreBlock
          score={team.score}
          isChanged={changedScoreKeys.has(changedScoreKey)}
        />
      ) : (
        <div className="ml-3 min-w-[2.5rem] text-right text-[1.45rem] font-black leading-none tracking-tight text-[#d4cdc0] sm:min-w-[3.25rem] sm:text-[2.35rem]">
          –
        </div>
      )}
    </div>
  );
}

function PlayoffBand({ game }: { game: Game }) {
  const finalSummary = getFinalSummary(game);

  if (!game.gameContext && !game.seriesSummary && !finalSummary) return null;

  return (
    <div className="mt-2.5 rounded-[1rem] bg-[#1a1208] px-3 py-2.5 text-white ring-1 ring-white/10">
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
  changedScoreKeys,
}: {
  game: Game;
  favoriteTeamAbbr: string | null;
  changedScoreKeys: Set<string>;
}) {
  const isFavoriteGame = gameIncludesTeam(game, favoriteTeamAbbr);

  return (
    <article
      className={`overflow-hidden rounded-[1.2rem] bg-[#ffffff] text-[#1a1208] shadow-xl shadow-black/15 ring-1 ring-[#e8e0d4] sm:rounded-[1.65rem] ${getCardAccentClasses(
        game.status
      )}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#e8e0d4] bg-[#f8f5f0] px-3 py-2.5">
        <div className="min-w-0">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-wide ring-1 ${getStatusClasses(
              game.status
            )}`}
          >
            {game.status === "live" && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-600" />
            )}
            {getStatusLabel(game.status)}
          </div>

          {game.status !== "final" && (
            <p className="mt-1 truncate text-[0.78rem] font-bold leading-tight text-[#a89880]">
              {game.status === "live"
                ? "Live now"
                : game.status === "upcoming" && isFavoriteGame
                  ? <CountdownText date={game.date} />
                  : getGameSubStatus(game)}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-[family-name:var(--font-display)] text-[1.08rem] font-black uppercase leading-none tracking-tight text-[#1a1208] sm:text-xl">
            {game.status === "live"
              ? game.statusText
              : formatGameDateTime(game.date)}
          </p>

          <p className="mt-1 font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-[0.14em] text-[#a89880]">
            {game.matchup}
          </p>
        </div>
      </div>

      <div className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="divide-y divide-[#e8e0d4]">
          <TeamLine
            game={game}
            side="away"
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
          />
          <TeamLine
            game={game}
            side="home"
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
          />
        </div>

        <PlayoffBand game={game} />
      </div>
    </article>
  );
}

function EmptyState({
  activeFilter,
  favoriteTeamAbbr,
  nextGame,
  nextFavoriteGame,
}: {
  activeFilter: GameFilter;
  favoriteTeamAbbr: string | null;
  nextGame?: Game;
  nextFavoriteGame?: Game;
}) {
  if (activeFilter === "live") {
    return (
      <section className="rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/20 ring-1 ring-[#e8e0d4]">
        <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
          No live games right now
        </p>

        <p className="mt-2 text-sm leading-6 text-[#a89880]">
          {nextGame
            ? `Next tipoff: ${formatGameTime(nextGame.date)} · ${nextGame.matchup}`
            : "Check back soon for live scores."}
        </p>
      </section>
    );
  }

  if (activeFilter === "my-team") {
    return (
      <section className="rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/20 ring-1 ring-[#e8e0d4]">
        <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
          {favoriteTeamAbbr ? `No ${favoriteTeamAbbr} games this week` : "No team selected"}
        </p>

        <p className="mt-2 text-sm leading-6 text-[#a89880]">
          {nextFavoriteGame
            ? `Next game: ${formatGameDateTime(nextFavoriteGame.date)} · ${nextFavoriteGame.matchup}`
            : "Try picking a different team."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/20 ring-1 ring-[#e8e0d4]">
      <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
        No games found
      </p>

      <p className="mt-2 text-sm leading-6 text-[#a89880]">
        Try a different filter.
      </p>
    </section>
  );
}

function SectionHeader({ section }: { section: GameSection }) {
  return (
    <div className="mb-2.5">
      <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[#a89880]">
        {section.title}
      </p>
      <hr className="border-[#d4cdc0]" />
    </div>
  );
}

// ─── Bracket ────────────────────────────────────────────────────────────────

type SeriesInfo = {
  key: string;
  abbrA: string;
  abbrB: string;
  teamA: Team & { wins: number };
  teamB: Team & { wins: number };
  conference: string;
  round: string;
  summary: string;
  status: "live" | "upcoming" | "complete";
  isGame7: boolean;
  nextGame?: Game;
  games: Game[];
};

/** Parse the authoritative series record from the seriesSummary string.
 *  Handles: "PHI WINS SERIES 4-3", "DEN LEADS SERIES 3-1", "SERIES TIED 2-2"
 *  abbrA and abbrB are the canonical sorted abbreviations for this series. */
function parseSeriesWins(
  summary: string,
  abbrA: string,
  abbrB: string
): { winsA: number; winsB: number } {
  const s = summary.toUpperCase();

  // "PHI WIN(S) SERIES 4-3"
  const winsMatch = s.match(/(\w+)\s+WINS?\s+SERIES\s+(\d+)-(\d+)/);
  if (winsMatch) {
    const winner = winsMatch[1];
    const hi = parseInt(winsMatch[2]);
    const lo = parseInt(winsMatch[3]);
    const aWon =
      winner === abbrA.toUpperCase() ||
      (!winner.includes(abbrB.toUpperCase()) && hi > lo);
    return aWon ? { winsA: hi, winsB: lo } : { winsA: lo, winsB: hi };
  }

  // "DEN LEAD(S) SERIES 3-1"
  const leadsMatch = s.match(/(\w+)\s+LEADS?\s+SERIES\s+(\d+)-(\d+)/);
  if (leadsMatch) {
    const leader = leadsMatch[1];
    const hi = parseInt(leadsMatch[2]);
    const lo = parseInt(leadsMatch[3]);
    const aLeads = leader === abbrA.toUpperCase();
    return aLeads ? { winsA: hi, winsB: lo } : { winsA: lo, winsB: hi };
  }

  // "SERIES TIED 3-3"
  const tiedMatch = s.match(/SERIES\s+TIED\s+(\d+)-(\d+)/);
  if (tiedMatch) {
    const n = parseInt(tiedMatch[1]);
    return { winsA: n, winsB: n };
  }

  return { winsA: 0, winsB: 0 };
}

function buildBracketSeries(allGames: Game[]): SeriesInfo[] {
  // Only playoff games have a seriesRound set
  const playoffGames = allGames.filter((g) => g.seriesRound);
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

      const getTeamData = (abbr: string): Team => {
        for (const g of sg) {
          if (g.away.abbreviation === abbr) return g.away;
          if (g.home.abbreviation === abbr) return g.home;
        }
        return sg[0].away;
      };

      // Use the most recent seriesSummary (from newest final game, or any game)
      const withSummary = sg
        .filter((g) => g.seriesSummary)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const summary = withSummary[0]?.seriesSummary ?? "";

      // Parse authoritative wins from summary string
      const { winsA, winsB } = summary
        ? parseSeriesWins(summary, abbrA, abbrB)
        : { winsA: 0, winsB: 0 };

      // Conference + round come from the API-level extraction
      const conference = sg.find((g) => g.seriesConference)?.seriesConference ?? "";
      const round = sg.find((g) => g.seriesRound)?.seriesRound ?? "";

      const liveGame = sg.find((g) => g.status === "live");
      const upcomingGames = sg
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
        games: sg,
      };
    }
  );

  // Sort within each series group: live → game7 → upcoming → complete
  return series.sort((a, b) => {
    const urgency = (s: SeriesInfo) => {
      if (s.status === "live") return 0;
      if (s.isGame7) return 1;
      if (s.status === "upcoming") return 2;
      return 3;
    };
    return urgency(a) - urgency(b);
  });
}

// ── Win dots: 7 dots (max games), 10px, 5px gap ─────────────────────────────
function WinDots({ wins, dotColor }: { wins: number; dotColor: string }) {
  return (
    <div className="flex shrink-0" style={{ gap: 5 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: i < wins ? dotColor : "#d4cdc0",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Three-tier series card ───────────────────────────────────────────────────
function SeriesCard({
  series,
  favoriteTeamAbbr,
}: {
  series: SeriesInfo;
  favoriteTeamAbbr: string | null;
}) {
  const isSeriesOver = series.teamA.wins === 4 || series.teamB.wins === 4;
  const winner = isSeriesOver
    ? series.teamA.wins === 4
      ? series.teamA
      : series.teamB
    : null;

  const gameDate = series.nextGame ? new Date(series.nextGame.date) : null;
  const isTonight = gameDate
    ? isSameScoreboardDay(gameDate, getScoreboardToday())
    : false;
  const isTomorrowGame = gameDate ? isTomorrow(gameDate) : false;

  // Tier 1 = live OR game7 tonight
  const isTier1 = series.status === "live" || (series.isGame7 && isTonight);
  // Tier 3 = complete
  const isTier3 = isSeriesOver;

  // Accent colors: orange for active, green for complete, neutral for upcoming
  const accentColor = isTier1 ? "#e85d04" : isTier3 ? "#2d7a3a" : "#d4cdc0";

  // Game 7 label
  const game7Label = series.isGame7
    ? series.status === "live"
      ? "Game 7"
      : isTonight
        ? "Game 7 Tonight"
        : isTomorrowGame
          ? "Game 7 Tomorrow"
          : null
    : null;

  const nextGameTime =
    series.nextGame && series.status !== "live"
      ? formatGameTime(series.nextGame.date)
      : null;

  const teams = [series.teamA, series.teamB] as (Team & { wins: number })[];

  return (
    <div
      className="overflow-hidden rounded-[1.35rem]"
      style={{
        border: isTier1
          ? "2px solid #e85d04"
          : "1px solid #e8e0d4",
        background: isTier3 ? "#f9f7f3" : "#ffffff",
      }}
    >
      <div className="flex">
        {/* Left accent bar — 3px, tier-colored */}
        <div style={{ width: 3, flexShrink: 0, background: accentColor }} />

        <div className="flex-1 px-3 py-3">
          {/* Tier 1: Game 7 badge + time */}
          {isTier1 && game7Label && (
            <div className="mb-3 flex items-center gap-2.5">
              <span
                style={{
                  background: "#e85d04",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 6,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                  lineHeight: 1,
                }}
              >
                {game7Label}
              </span>
              {nextGameTime && (
                <span className="text-[0.72rem] font-semibold text-[#a89880]">
                  {nextGameTime}
                </span>
              )}
              {series.status === "live" && (
                <span className="flex items-center gap-1 text-[0.72rem] font-bold text-[#e85d04]">
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: "#e85d04" }}
                  />
                  {series.nextGame?.statusText ?? "Live"}
                </span>
              )}
            </div>
          )}

          {/* Team rows */}
          {teams.map((team, idx) => {
            const isWinner = winner?.abbreviation === team.abbreviation;
            const isLoser = isSeriesOver && !isWinner;
            const isMyTeamRow = team.abbreviation === favoriteTeamAbbr;
            const dotColor = isLoser ? "#d4cdc0" : accentColor;

            return (
              <div
                key={team.abbreviation}
                className={`flex items-center justify-between ${
                  idx === 1 ? "mt-2 border-t border-[#f0ece4] pt-2" : ""
                }`}
                style={{ opacity: isLoser ? 0.35 : 1 }}
              >
                {/* Logo + name */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      width: 32,
                      height: 32,
                      background: "#f8f5f0",
                      boxShadow: "0 0 0 1px #e8e0d4",
                    }}
                  >
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt=""
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <span className="text-[8px] font-black text-[#1a1208]">
                        {team.abbreviation}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.9rem] font-black tracking-tight text-[#1a1208]">
                        {team.abbreviation}
                      </span>
                      {isMyTeamRow && (
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide text-[#e85d04]">
                          MY TEAM
                        </span>
                      )}
                      {isSeriesOver && isWinner && (
                        <span
                          className="rounded-full px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide text-white"
                          style={{ background: "#2d7a3a" }}
                        >
                          WIN
                        </span>
                      )}
                    </div>
                    <span className="block truncate text-[0.67rem] font-medium text-[#a89880]">
                      {team.name}
                    </span>
                  </div>
                </div>

                {/* Dots + win count */}
                <div className="flex shrink-0 items-center gap-2.5 pl-2">
                  <WinDots wins={team.wins} dotColor={dotColor} />
                  <span
                    className="tabular-nums leading-none"
                    style={{
                      width: 18,
                      textAlign: "right",
                      fontSize: "1.3rem",
                      fontWeight: 900,
                      color: isLoser ? "#c0b0a0" : "#1a1208",
                    }}
                  >
                    {team.wins}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Live badge (non-game7) */}
              {series.status === "live" && !isTier1 && (
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide"
                  style={{ background: "#fff0e8", color: "#e85d04" }}
                >
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: "#e85d04" }}
                  />
                  {series.nextGame?.statusText ?? "Live"}
                </span>
              )}
              {/* Non-tier-1 game7 badge */}
              {game7Label && !isTier1 && (
                <span
                  className="rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide"
                  style={{ background: "#fff0e8", color: "#e85d04" }}
                >
                  {game7Label}
                </span>
              )}
              {series.summary && (
                <span className="text-[0.68rem] font-semibold text-[#a89880]">
                  {series.summary}
                </span>
              )}
            </div>
            {/* Next game time (non-live, non-tier1 only) */}
            {series.nextGame && series.status !== "live" && !isTier1 && (
              <span className="shrink-0 text-[0.68rem] font-semibold text-[#a89880]">
                {formatGameDateTime(series.nextGame.date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tier 2: pending second-round slot ────────────────────────────────────────
function PendingSeriesCard({
  feeder1,
  feeder2,
}: {
  feeder1: SeriesInfo | null;
  feeder2: SeriesInfo | null;
}) {
  const getWinner = (s: SeriesInfo | null) => {
    if (!s) return null;
    if (s.teamA.wins === 4) return s.teamA;
    if (s.teamB.wins === 4) return s.teamB;
    return null;
  };

  const winner1 = getWinner(feeder1);
  const winner2 = getWinner(feeder2);

  let statusNote = "Starts TBD";
  if (winner1 && winner2) statusNote = "Series upcoming";
  else if (winner1)
    statusNote = `${winner1.abbreviation} advances · Awaiting other winner`;
  else if (winner2)
    statusNote = `${winner2.abbreviation} advances · Awaiting other winner`;

  const TeamSlot = ({
    winner,
    feeder,
    idx,
  }: {
    winner: (Team & { wins: number }) | null;
    feeder: SeriesInfo | null;
    idx: number;
  }) => (
    <div
      className={`flex items-center justify-between ${
        idx === 1 ? "mt-2 border-t border-[#ede8e0] pt-2" : ""
      }`}
      style={{ opacity: winner ? 1 : 0.45 }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: 32,
            height: 32,
            background: "#ede8e0",
            boxShadow: "0 0 0 1px #e0d8d0",
          }}
        >
          {winner?.logo ? (
            <img
              src={winner.logo}
              alt=""
              className="h-5 w-5 object-contain"
            />
          ) : (
            <span className="text-[0.55rem] font-black text-[#a89880]">
              TBD
            </span>
          )}
        </div>
        <div>
          <span className="text-[0.9rem] font-black tracking-tight text-[#1a1208]">
            {winner ? winner.abbreviation : "TBD"}
          </span>
          {!winner && feeder && (
            <p className="text-[0.65rem] font-medium text-[#a89880]">
              {feeder.abbrA} vs {feeder.abbrB}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 pl-2">
        <WinDots wins={0} dotColor="#d4cdc0" />
        <span
          className="tabular-nums leading-none text-[#d4cdc0]"
          style={{ width: 18, textAlign: "right", fontSize: "1.3rem", fontWeight: 900 }}
        >
          –
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="overflow-hidden rounded-[1.35rem]"
      style={{
        border: "1px dashed #d4cdc0",
        background: "#faf8f4",
      }}
    >
      <div className="flex">
        <div style={{ width: 3, flexShrink: 0, background: "#e8e0d4" }} />
        <div className="flex-1 px-3 py-3">
          <TeamSlot winner={winner1} feeder={feeder1} idx={0} />
          <TeamSlot winner={winner2} feeder={feeder2} idx={1} />
          <p className="mt-2.5 text-[0.68rem] font-semibold text-[#a89880]">
            {statusNote}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── BracketView ───────────────────────────────────────────────────────────────
function BracketView({
  games,
  favoriteTeamAbbr,
}: {
  games: Game[];
  favoriteTeamAbbr: string | null;
}) {
  const allSeries = buildBracketSeries(games);

  if (allSeries.length === 0) {
    return (
      <div className="rounded-[1.75rem] bg-[#ffffff] p-10 text-center ring-1 ring-[#e8e0d4]">
        <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase tracking-tight text-[#1a1208]">
          No playoff series
        </p>
        <p className="mt-2 text-sm leading-6 text-[#a89880]">
          Bracket will appear here once the playoffs begin.
        </p>
      </div>
    );
  }

  const firstRound = allSeries.filter((s) => s.round === "First Round");
  const secondRound = allSeries.filter((s) => s.round === "Second Round");
  const confFinals = allSeries.filter((s) => s.round === "Conf Finals");
  const finals = allSeries.filter((s) => s.round === "NBA Finals");

  const firstRoundActive = firstRound.some((s) => s.status !== "complete");

  // Round section header
  function RoundHeader({
    title,
    note,
  }: {
    title: string;
    note?: ReactNode;
  }) {
    return (
      <div className="mb-3">
        <div className="mb-1.5 flex items-center gap-2">
          <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.1em] text-[#a89880]">
            {title}
          </p>
          {note}
        </div>
        <hr className="border-[#d4cdc0]" />
      </div>
    );
  }

  // East + West two-column grid of actual SeriesCards
  function EastWestGrid({ series }: { series: SeriesInfo[] }) {
    const east = series
      .filter((s) => s.conference === "East")
      .sort((a, b) => {
        const rank = (x: SeriesInfo) =>
          x.status === "live" ? 0 : x.isGame7 ? 1 : x.status === "upcoming" ? 2 : 3;
        return rank(a) - rank(b);
      });
    const west = series
      .filter((s) => s.conference === "West")
      .sort((a, b) => {
        const rank = (x: SeriesInfo) =>
          x.status === "live" ? 0 : x.isGame7 ? 1 : x.status === "upcoming" ? 2 : 3;
        return rank(a) - rank(b);
      });
    if (!east.length && !west.length) return null;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {east.length > 0 && (
          <div className="space-y-2.5">
            <p className="px-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-[#c0b0a0]">
              East
            </p>
            {east.map((s) => (
              <SeriesCard key={s.key} series={s} favoriteTeamAbbr={favoriteTeamAbbr} />
            ))}
          </div>
        )}
        {west.length > 0 && (
          <div className="space-y-2.5">
            <p className="px-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-[#c0b0a0]">
              West
            </p>
            {west.map((s) => (
              <SeriesCard key={s.key} series={s} favoriteTeamAbbr={favoriteTeamAbbr} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Build second round display: pair first-round series into slots,
  // use actual second-round series when available, otherwise pending cards.
  function SecondRoundConf({
    conf,
  }: {
    conf: string;
  }) {
    const confFirst = firstRound
      .filter((s) => s.conference === conf)
      .sort((a, b) => a.key.localeCompare(b.key));
    const confActual = secondRound.filter((s) => s.conference === conf);

    if (!confFirst.length && !confActual.length) return null;

    const slots: ReactNode[] = [];

    // Pair first-round series: [0,1] → slot 0, [2,3] → slot 1, etc.
    for (let i = 0; i < Math.max(confFirst.length, confActual.length * 2); i += 2) {
      const f1 = confFirst[i] ?? null;
      const f2 = confFirst[i + 1] ?? null;
      const slotIdx = Math.floor(i / 2);

      // Try to match an actual second-round series to this slot
      const w1 = f1 ? (f1.teamA.wins === 4 ? f1.teamA : f1.teamB.wins === 4 ? f1.teamB : null) : null;
      const w2 = f2 ? (f2.teamA.wins === 4 ? f2.teamA : f2.teamB.wins === 4 ? f2.teamB : null) : null;

      const matchedActual =
        w1 && w2
          ? (confActual.find((s) => {
              const t = new Set([s.abbrA, s.abbrB]);
              return t.has(w1.abbreviation) && t.has(w2.abbreviation);
            }) ?? confActual[slotIdx] ?? null)
          : confActual[slotIdx] ?? null;

      if (matchedActual) {
        slots.push(
          <SeriesCard
            key={matchedActual.key}
            series={matchedActual}
            favoriteTeamAbbr={favoriteTeamAbbr}
          />
        );
      } else {
        slots.push(
          <PendingSeriesCard
            key={`pending-${conf}-${slotIdx}`}
            feeder1={f1}
            feeder2={f2}
          />
        );
      }
    }

    return <>{slots}</>;
  }

  const hasSecondRound =
    firstRound.length > 0 || secondRound.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* NBA Finals */}
      {finals.length > 0 && (
        <div>
          <RoundHeader title="NBA Finals" />
          <div className="mx-auto max-w-sm space-y-2.5">
            {finals.map((s) => (
              <SeriesCard key={s.key} series={s} favoriteTeamAbbr={favoriteTeamAbbr} />
            ))}
          </div>
        </div>
      )}

      {/* Conference Finals */}
      {confFinals.length > 0 && (
        <div>
          <RoundHeader title="Conf Finals" />
          <EastWestGrid series={confFinals} />
        </div>
      )}

      {/* Second Round */}
      {hasSecondRound && (
        <div>
          <RoundHeader
            title="Second Round"
            note={
              firstRoundActive ? (
                <span
                  className="text-[0.65rem] font-bold"
                  style={{ color: "#e85d04" }}
                >
                  Advancing soon
                </span>
              ) : undefined
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(firstRound.some((s) => s.conference === "East") ||
              secondRound.some((s) => s.conference === "East")) && (
              <div className="space-y-2.5">
                <p className="px-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-[#c0b0a0]">
                  East
                </p>
                <SecondRoundConf conf="East" />
              </div>
            )}
            {(firstRound.some((s) => s.conference === "West") ||
              secondRound.some((s) => s.conference === "West")) && (
              <div className="space-y-2.5">
                <p className="px-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-[#c0b0a0]">
                  West
                </p>
                <SecondRoundConf conf="West" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* First Round */}
      {firstRound.length > 0 && (
        <div>
          <RoundHeader title="First Round" />
          <EastWestGrid series={firstRound} />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState<"scores" | "bracket">("scores");
  const [activeFilter, setActiveFilter] = useState<GameFilter>("all");
  const [favoriteTeamAbbr, setFavoriteTeamAbbr] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [changedScoreKeys, setChangedScoreKeys] = useState<Set<string>>(new Set());

  const previousScoresRef = useRef<Map<string, number>>(new Map());
  const scoreAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request push notification permission once user picks a team
  usePushNotifications(favoriteTeamAbbr);

  useEffect(() => {
    const storedFavoriteTeam =
      localStorage.getItem(FAVORITE_TEAM_STORAGE_KEY) ||
      localStorage.getItem(OLD_FOLLOWED_TEAM_STORAGE_KEY);

    if (storedFavoriteTeam) {
      const hydrationTimeout = setTimeout(() => {
        setFavoriteTeamAbbr(storedFavoriteTeam);
        localStorage.setItem(FAVORITE_TEAM_STORAGE_KEY, storedFavoriteTeam);
        localStorage.removeItem(OLD_FOLLOWED_TEAM_STORAGE_KEY);
      }, 0);

      return () => clearTimeout(hydrationTimeout);
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
        const nextGames = (data.games || []) as Game[];

        if (isMounted) {
          const nextScores = new Map<string, number>();
          const changedKeys = new Set<string>();
          const hadPreviousScores = previousScoresRef.current.size > 0;

          nextGames.forEach((game) => {
            (["away", "home"] as const).forEach((side) => {
              const key = `${game.id}-${side}`;
              const nextScore = game[side].score;
              const previousScore = previousScoresRef.current.get(key);

              nextScores.set(key, nextScore);

              if (
                hadPreviousScores &&
                typeof previousScore === "number" &&
                previousScore !== nextScore
              ) {
                changedKeys.add(key);
              }
            });
          });

          previousScoresRef.current = nextScores;
          setGames(nextGames);
          setLastUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : new Date());

          if (changedKeys.size > 0) {
            triggerLightHaptic();
            setChangedScoreKeys(changedKeys);

            if (scoreAnimationTimeoutRef.current) {
              clearTimeout(scoreAnimationTimeoutRef.current);
            }

            scoreAnimationTimeoutRef.current = setTimeout(() => {
              setChangedScoreKeys(new Set());
            }, 900);
          }
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

      if (scoreAnimationTimeoutRef.current) {
        clearTimeout(scoreAnimationTimeoutRef.current);
      }
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

  // Always show the full week — sections are already grouped by day (Today, Tomorrow, etc.)
  const filteredGames = useMemo(() => {
    const selectedGames = games.filter((game) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "my-team") return gameIncludesTeam(game, favoriteTeamAbbr);
      return game.status === activeFilter;
    });

    return sortGamesForDisplay(selectedGames, favoriteTeamAbbr);
  }, [games, activeFilter, favoriteTeamAbbr]);

  const sections = useMemo(() => {
    return buildSections(filteredGames, activeFilter);
  }, [filteredGames, activeFilter]);

  const counts = useMemo(() => {
    return games.reduce(
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
  }, [games, favoriteTeamAbbr]);

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

  const nextFavoriteGame = useMemo(() => {
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
  }, [games, favoriteTeamAbbr, lastUpdatedAt]);

  return (
    <main className="min-h-[100svh] bg-[#f5f1ea] px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+0.65rem)] text-[#1a1208] sm:px-6 md:pb-36 md:pt-[calc(env(safe-area-inset-top)+2rem)]">
      <style jsx global>{`
        @keyframes no-noise-live-card {
          0%,
          100% {
            box-shadow: 0 18px 35px rgba(0, 0, 0, 0.15);
          }
          50% {
            box-shadow: 0 18px 35px rgba(0, 0, 0, 0.15),
              0 -2px 18px rgba(249, 115, 22, 0.22);
          }
        }

        @keyframes no-noise-score-pop {
          0% {
            transform: scale(1);
          }
          35% {
            transform: scale(1.13);
            color: #f97316;
          }
          100% {
            transform: scale(1);
          }
        }

        .no-noise-live-card {
          animation: no-noise-live-card 2.4s ease-in-out infinite;
        }

        .no-noise-score-pop {
          animation: no-noise-score-pop 0.8s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .no-noise-live-card,
          .no-noise-score-pop {
            animation: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <header className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.svg"
              alt="No Noise Scores logo"
              className="h-5 w-5"
            />
            <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-tight text-[#1a1208]">
              No Noise Scores
            </span>
          </div>

          <Link
            href="/hoops"
            aria-label="Open No Noise Hoops"
            title="No Noise Hoops"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-25 transition hover:opacity-60 active:scale-95"
          >
            <img
              src="/favicon.svg"
              alt=""
              className="h-5 w-5"
            />
          </Link>
        </header>

        {/* Tab nav */}
        <div className="mb-3 flex gap-2 px-1">
          <button
            type="button"
            onClick={() => setActiveTab("scores")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              activeTab === "scores"
                ? "bg-[#1a1208] text-[#f5f1ea]"
                : "text-[#8a7a66]"
            }`}
          >
            Scores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bracket")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              activeTab === "bracket"
                ? "bg-[#1a1208] text-[#f5f1ea]"
                : "text-[#8a7a66]"
            }`}
          >
            Bracket
          </button>
        </div>

        {activeTab === "scores" && (
          <>
            <div className="mb-5 sm:mb-8">
              <div className="rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1.5 shadow-sm sm:p-2">
                <div className="flex items-center gap-1.5">
                  {/* Scrollable pills — overflow is isolated here so the picker dropdown is never clipped */}
                  <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <FilterPill
                      label="Live"
                      count={counts.live}
                      active={activeFilter === "live"}
                      disabled={counts.live === 0 && activeFilter !== "live"}
                      onClick={() => setActiveFilter(activeFilter === "live" ? "all" : "live")}
                    />

                    <FilterPill
                      label="Upcoming"
                      compactLabel="Next"
                      count={counts.upcoming}
                      active={activeFilter === "upcoming"}
                      disabled={counts.upcoming === 0 && activeFilter !== "upcoming"}
                      onClick={() => setActiveFilter(activeFilter === "upcoming" ? "all" : "upcoming")}
                    />

                    <FilterPill
                      label="Final"
                      count={counts.final}
                      active={activeFilter === "final"}
                      disabled={counts.final === 0 && activeFilter !== "final"}
                      onClick={() => setActiveFilter(activeFilter === "final" ? "all" : "final")}
                    />

                    <FilterPill
                      label="My Team"
                      compactLabel="Mine"
                      count={counts.myTeam}
                      active={activeFilter === "my-team"}
                      disabled={!favoriteTeamAbbr}
                      onClick={() => setActiveFilter(activeFilter === "my-team" ? "all" : "my-team")}
                    />
                  </div>

                  {/* Picker lives outside the overflow container so its dropdown opens freely */}
                  <div className="shrink-0 pl-0.5">
                    <FavoriteTeamPicker
                      teams={availableTeams}
                      favoriteTeamAbbr={favoriteTeamAbbr}
                      onChange={handleFavoriteTeamChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="mb-4 px-1 font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-[0.16em] text-[#c0b0a0]">
              {formatLastUpdated(lastUpdatedAt)}
            </p>

            {sections.length > 0 ? (
              <div className="max-w-4xl mx-auto">
                <div className="space-y-6 sm:space-y-8">
                  {sections.map((section) => (
                    <section key={`${section.title}-${section.eyebrow || ""}`}>
                      <SectionHeader section={section} />

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-2">
                        {section.games.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            favoriteTeamAbbr={favoriteTeamAbbr}
                            changedScoreKeys={changedScoreKeys}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : !hasLoadedOnce ? (
              <section className="rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-sm ring-1 ring-[#e8e0d4]">
                <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
                  Loading scores...
                </p>

                <p className="mt-2 text-sm leading-6 text-[#a89880]">
                  Pulling the latest scoreboard.
                </p>
              </section>
            ) : (
              <EmptyState
                activeFilter={activeFilter}
                favoriteTeamAbbr={favoriteTeamAbbr}
                nextGame={nextUpcomingGame}
                nextFavoriteGame={nextFavoriteGame}
              />
            )}
          </>
        )}

        {activeTab === "bracket" && (
          <BracketView games={games} favoriteTeamAbbr={favoriteTeamAbbr} />
        )}
      </div>
    </main>
  );
}

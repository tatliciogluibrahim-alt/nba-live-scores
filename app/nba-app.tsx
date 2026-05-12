"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
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

// ── Share card ────────────────────────────────────────────────────────────────

type SharePayload =
  | { kind: "game"; game: Game }
  | { kind: "series"; series: SeriesInfo };

function ShareCardCanvas({ payload }: { payload: SharePayload }) {
  const isGame = payload.kind === "game";

  const teamA = isGame ? payload.game.away : payload.series.teamA;
  const teamB = isGame ? payload.game.home : payload.series.teamB;
  const contextLine = isGame
    ? (() => {
        const g = payload.game;
        if (g.status === "final") return `FINAL · ${g.matchup}`;
        if (g.status === "live") return `LIVE · ${g.statusText} · ${g.matchup}`;
        return `UPCOMING · ${g.matchup}`;
      })()
    : (() => {
        const s = payload.series;
        const wA = s.teamA.wins;
        const wB = s.teamB.wins;
        if (wA === 4 || wB === 4) {
          const winner = wA === 4 ? s.teamA : s.teamB;
          return `${winner.abbreviation} WINS SERIES ${Math.max(wA, wB)}–${Math.min(wA, wB)}`;
        }
        if (s.isGame7) return `GAME 7 · ${s.summary || `${s.abbrA} VS ${s.abbrB}`}`;
        return (s.summary || `${s.abbrA} VS ${s.abbrB}`).toUpperCase();
      })();

  function renderTeamLogo(team: Team) {
    if (team.logo) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logo}
          alt=""
          style={{ width: 58, height: 58, objectFit: "contain" }}
        />
      );
    }

    return (
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "#fffaf2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 900,
          color: "#1a1208",
          boxShadow: "0 0 0 1px #e8e0d4",
        }}
      >
        {team.abbreviation}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 540,
        height: 540,
        background: "#f5f1ea",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 42,
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "#07111f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 22px rgba(7,17,31,0.18)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="" style={{ width: 25, height: 25 }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#e85d04", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              No Noise
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 950, color: "#1a1208", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Scores
            </p>
          </div>
        </div>

        <p style={{ margin: 0, maxWidth: 230, textAlign: "right", fontSize: 13, fontWeight: 800, color: "#e85d04", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.25 }}>
          {contextLine}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          borderRadius: 28,
          background: "#fffaf2",
          padding: "26px 24px",
          boxShadow: "0 0 0 1px #e8e0d4, 0 18px 38px rgba(26,18,8,0.08)",
        }}
      >
        {[teamA, teamB].map((team, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
            <div style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 16 }}>
              {renderTeamLogo(team)}
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 52,
                    fontWeight: 950,
                    letterSpacing: "-0.055em",
                    color: "#1a1208",
                    lineHeight: 0.92,
                  }}
                >
                  {team.abbreviation}
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 13, fontWeight: 700, color: "#a89880", lineHeight: 1.1 }}>
                  {team.name}
                </p>
              </div>
            </div>

            {isGame ? (
              <span
                style={{
                  minWidth: 82,
                  textAlign: "right",
                  fontSize: 64,
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                  color: "#1a1208",
                  lineHeight: 0.92,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i === 0 ? payload.game.away.score : payload.game.home.score}
              </span>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const wins = i === 0
                    ? (payload as { kind: "series"; series: SeriesInfo }).series.teamA.wins
                    : (payload as { kind: "series"; series: SeriesInfo }).series.teamB.wins;
                  return (
                    <div
                      key={di}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: di < wins ? "#e85d04" : "#d4cdc0",
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#a89880", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          No feeds. No clutter.
        </p>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#a89880" }}>
          nonoisescores.app · @nonoisescores
        </p>
      </div>
    </div>
  );
}

function ShareModal({
  payload,
  onClose,
}: {
  payload: SharePayload;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "no-noise-scores.png", { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "No Noise Scores" });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "no-noise-scores.png";
        link.click();
      }
    } catch (e) {
      console.error("Share failed", e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col items-center gap-4 rounded-[1.5rem] bg-[#f5f1ea] p-5 shadow-2xl">
        {/* Preview — rendered at 540px, captured at 1080px via pixelRatio:2 */}
        <div
          ref={cardRef}
          style={{ width: 300, height: 300, transform: "scale(1)", transformOrigin: "top left", pointerEvents: "none" }}
          className="overflow-hidden rounded-2xl shadow-lg"
        >
          {/* Inner at 540×540 scaled down to 300×300 via CSS */}
          <div style={{ width: 540, height: 540, transform: "scale(0.5556)", transformOrigin: "top left" }}>
            <ShareCardCanvas payload={payload} />
          </div>
        </div>

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-[#d4cdc0] py-2.5 text-sm font-bold text-[#8a7a66] transition hover:bg-[#e8e2d8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-full bg-[#1a1208] py-2.5 text-sm font-bold text-[#f5f1ea] transition hover:bg-[#2a1e10] disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Share"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white/70 transition hover:bg-white/30 active:scale-95"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    </button>
  );
}

function PlayoffBand({ game }: { game: Game }) {
  const [shareOpen, setShareOpen] = useState(false);
  const finalSummary = getFinalSummary(game);

  if (!game.gameContext && !game.seriesSummary && !finalSummary) return null;

  return (
    <>
      <div className="mt-2.5 rounded-[1rem] bg-[#1a1208] px-3 py-2.5 text-white ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
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
          <ShareButton onClick={() => setShareOpen(true)} />
        </div>
      </div>
      {shareOpen && (
        <ShareModal
          payload={{ kind: "game", game }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
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
  latestGame?: Game;
  source: "api" | "inferred";
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

function getRoundRank(round: string) {
  if (round === "First Round") return 0;
  if (round === "Second Round") return 1;
  if (round === "Conf Finals") return 2;
  if (round === "NBA Finals") return 3;
  return 4;
}

function getSeriesUrgencyRank(series: SeriesInfo) {
  if (series.status === "live") return 0;
  if (series.isGame7) return 1;
  if (series.status === "upcoming") return 2;
  return 3;
}

function deriveWinsFromFinalGames(
  games: Game[],
  abbrA: string,
  abbrB: string
) {
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

function prettifySeriesSummary(summary: string) {
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

function getSeriesRecord(series: SeriesInfo) {
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

function getSeriesLabel(series: SeriesInfo) {
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

function getSeriesGameLabel(series: SeriesInfo) {
  const context =
    series.nextGame?.gameContext ||
    series.latestGame?.gameContext ||
    series.games.find((game) => game.gameContext)?.gameContext ||
    "";
  const match = context.match(/game\s+[1-7]/i);

  return match ? match[0].replace(/^game/i, "Game") : "";
}

function getSeriesStatusLabel(series: SeriesInfo) {
  if (series.status === "live") return "Live";
  if (series.nextGame?.status === "upcoming") return "Upcoming";
  if (series.latestGame?.status === "final") return "Final";
  if (series.status === "complete") return "Final";
  return "Upcoming";
}

function getSeriesStatusPillClasses(series: SeriesInfo) {
  const statusLabel = getSeriesStatusLabel(series);

  if (statusLabel === "Live") {
    return "bg-orange-100 text-orange-800 ring-orange-200";
  }

  if (statusLabel === "Final") {
    return "bg-slate-200 text-slate-700 ring-slate-300";
  }

  return "bg-blue-100 text-blue-800 ring-blue-200";
}

function buildBracketSeries(allGames: Game[]): SeriesInfo[] {
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

      // Use the most recent seriesSummary (from newest final game, or any game)
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

  // Sort by bracket order, then urgency inside each round.
  return series.sort((a, b) => {
    const roundDifference = getRoundRank(a.round) - getRoundRank(b.round);
    if (roundDifference !== 0) return roundDifference;

    const conferenceDifference = a.conference.localeCompare(b.conference);
    if (conferenceDifference !== 0) return conferenceDifference;

    return getSeriesUrgencyRank(a) - getSeriesUrgencyRank(b);
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
  const [shareOpen, setShareOpen] = useState(false);
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
  const seriesGameLabel = getSeriesGameLabel(series);
  const seriesLabel = seriesGameLabel
    ? `${getSeriesLabel(series)} · ${seriesGameLabel}`
    : getSeriesLabel(series);
  const seriesRecord = getSeriesRecord(series);
  const statusLabel = getSeriesStatusLabel(series);

  return (
    <>
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
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase text-[#a89880]">
                {seriesLabel}
              </p>
              <p className="mt-0.5 text-[0.72rem] font-semibold text-[#8a7a66]">
                {seriesRecord}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-[family-name:var(--font-display)] text-[8px] font-black uppercase ring-1 ${getSeriesStatusPillClasses(
                series
              )}`}
            >
              {statusLabel === "Live" && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-600" />
              )}
              {statusLabel}
            </span>
          </div>

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
            </div>
            <div className="flex items-center gap-2">
              {/* Next game time (non-live, non-tier1 only) */}
              {series.nextGame && series.status !== "live" && !isTier1 && (
                <span className="shrink-0 text-[0.68rem] font-semibold text-[#a89880]">
                  Next: {formatGameDateTime(series.nextGame.date)}
                </span>
              )}
              {/* Share button */}
              <button
                type="button"
                aria-label="Share series"
                onClick={() => setShareOpen(true)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8e0d4] text-[#8a7a66] transition hover:bg-[#d4cdc0] active:scale-95"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    {shareOpen && (
      <ShareModal
        payload={{ kind: "series", series }}
        onClose={() => setShareOpen(false)}
      />
    )}
  </>
  );
}

// ── TeamView ──────────────────────────────────────────────────────────────────

function SeriesGameRow({ game, teamAbbr }: { game: Game; teamAbbr: string }) {
  const isHome = game.home.abbreviation === teamAbbr;
  const myTeam = isHome ? game.home : game.away;
  const opp = isHome ? game.away : game.home;
  const isWin =
    game.status === "final" && myTeam.score > opp.score;
  const isLoss =
    game.status === "final" && myTeam.score < opp.score;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 odd:bg-[#f8f5f0]">
      <div className="flex items-center gap-2 min-w-0">
        {game.status === "final" && (
          <span
            className="w-5 shrink-0 text-center text-[0.65rem] font-black uppercase"
            style={{ color: isWin ? "#2d7a3a" : isLoss ? "#a89880" : "#a89880" }}
          >
            {isWin ? "W" : isLoss ? "L" : "–"}
          </span>
        )}
        {game.status === "live" && (
          <span className="w-5 shrink-0 text-center text-[0.65rem] font-black uppercase text-[#e85d04]">
            ▶
          </span>
        )}
        {game.status === "upcoming" && (
          <span className="w-5 shrink-0 text-center text-[0.65rem] font-semibold text-[#a89880]">
            –
          </span>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          {opp.logo ? (
            <img src={opp.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : null}
          <span className="text-[0.78rem] font-black tracking-tight text-[#1a1208]">
            {isHome ? "vs" : "@"} {opp.abbreviation}
          </span>
        </div>
        <span className="text-[0.68rem] font-medium text-[#a89880] truncate">
          {game.gameContext}
        </span>
      </div>
      <div className="shrink-0 text-right">
        {game.status !== "upcoming" ? (
          <span
            className="text-[0.85rem] font-black tabular-nums"
            style={{ color: isWin ? "#2d7a3a" : isLoss ? "#a89880" : "#1a1208" }}
          >
            {myTeam.score}–{opp.score}
          </span>
        ) : (
          <span className="text-[0.72rem] font-semibold text-[#a89880]">
            {formatGameTime(game.date)}
          </span>
        )}
      </div>
    </div>
  );
}

function TeamView({
  games,
  favoriteTeamAbbr,
  changedScoreKeys,
}: {
  games: Game[];
  favoriteTeamAbbr: string;
  changedScoreKeys: Set<string>;
}) {
  const allSeries = buildBracketSeries(games);

  // Find this team's data
  const teamGames = games.filter((g) => gameIncludesTeam(g, favoriteTeamAbbr));
  const teamData = (() => {
    for (const g of teamGames) {
      if (g.away.abbreviation === favoriteTeamAbbr) return g.away;
      if (g.home.abbreviation === favoriteTeamAbbr) return g.home;
    }
    return null;
  })();

  // Next upcoming game
  const nextGame = teamGames
    .filter((g) => g.status === "upcoming" || g.status === "live")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  // Playoff series for this team
  const teamSeries = allSeries.filter(
    (s) => s.abbrA === favoriteTeamAbbr || s.abbrB === favoriteTeamAbbr
  );

  // Playoff record: sum wins across all series
  const { totalWins, totalLosses } = teamSeries.reduce(
    (acc, s) => {
      const isA = s.abbrA === favoriteTeamAbbr;
      acc.totalWins += isA ? s.teamA.wins : s.teamB.wins;
      acc.totalLosses += isA ? s.teamB.wins : s.teamA.wins;
      return acc;
    },
    { totalWins: 0, totalLosses: 0 }
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Team header */}
      <div className="flex items-center gap-3 px-1">
        {teamData?.logo ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white ring-2 ring-[#e8e0d4]">
            <img src={teamData.logo} alt="" className="h-8 w-8 object-contain" />
          </div>
        ) : null}
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
            {teamData?.name ?? favoriteTeamAbbr}
          </p>
          {teamSeries.length > 0 && (
            <p className="text-[0.72rem] font-bold uppercase tracking-wide text-[#a89880]">
              Playoff record: {totalWins}–{totalLosses}
            </p>
          )}
        </div>
      </div>

      {/* Next game */}
      {nextGame && (
        <div>
          <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[#a89880]">
            {nextGame.status === "live" ? "In Progress" : "Next Game"}
          </p>
          <GameCard
            game={nextGame}
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
          />
        </div>
      )}

      {/* Playoff series */}
      {teamSeries.length > 0 && (
        <div className="space-y-5">
          {teamSeries.map((series) => {
            const seriesGames = [...series.games].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            return (
              <div key={series.key}>
                <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[#a89880]">
                  {series.round}
                </p>
                <SeriesCard series={series} favoriteTeamAbbr={favoriteTeamAbbr} />
                <div className="mt-2 overflow-hidden rounded-[1rem] bg-white ring-1 ring-[#e8e0d4]">
                  {seriesGames.map((g) => (
                    <SeriesGameRow key={g.id} game={g} teamAbbr={favoriteTeamAbbr} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {teamSeries.length === 0 && teamGames.length === 0 && (
        <div className="rounded-[1.75rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
          <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
            No games this week
          </p>
        </div>
      )}
    </div>
  );
}

// ── BracketView ───────────────────────────────────────────────────────────────
function BracketEmptyState({
  onBackToScores,
}: {
  onBackToScores: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/10 ring-1 ring-[#e8e0d4] sm:p-10">
      <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase text-[#1a1208] sm:text-5xl">
        Bracket loading soon
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8a7a66]">
        Scores are live now. Series view appears when playoff matchups are available.
      </p>
      <button
        type="button"
        onClick={onBackToScores}
        className="mt-6 rounded-full bg-[#1a1208] px-5 py-2.5 font-[family-name:var(--font-display)] text-xs font-black uppercase text-[#f5f1ea] transition hover:bg-[#2a1e10] active:scale-95"
      >
        Back to Scores
      </button>
    </section>
  );
}

function LockedSeriesCard({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-dashed border-[#d4cdc0] bg-[#faf8f4]">
      <div className="flex">
        <div className="w-[3px] shrink-0 bg-[#e8e0d4]" />
        <div className="flex-1 px-3 py-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase text-[#a89880]">
                {label}
              </p>
              <p className="mt-0.5 text-[0.72rem] font-semibold text-[#8a7a66]">
                {body}
              </p>
            </div>
            <span className="rounded-full bg-[#ede8df] px-2.5 py-1 font-[family-name:var(--font-display)] text-[8px] font-black uppercase text-[#8a7a66] ring-1 ring-[#d4cdc0]">
              Soon
            </span>
          </div>

          {[0, 1].map((slot) => (
            <div
              key={slot}
              className={`flex items-center gap-2.5 ${
                slot === 1 ? "mt-2 border-t border-[#ede8e0] pt-2" : ""
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ede8e0] ring-1 ring-[#e0d8d0]">
                <span className="text-[0.5rem] font-black text-[#a89880]">TBD</span>
              </div>
              <span className="text-[0.72rem] font-semibold text-[#a89880]">
                Awaiting matchup
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BracketRoundColumn({
  title,
  series,
  favoriteTeamAbbr,
  lockedBody,
}: {
  title: string;
  series: SeriesInfo[];
  favoriteTeamAbbr: string | null;
  lockedBody?: string;
}) {
  if (!series.length && !lockedBody) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase text-[#a89880]">
          {title}
        </p>
        <span className="text-[0.62rem] font-bold uppercase text-[#c0b0a0]">
          {series.length ? `${series.length} series` : "Locked"}
        </span>
      </div>

      {series.length > 0 ? (
        series.map((item) => (
          <SeriesCard
            key={item.key}
            series={item}
            favoriteTeamAbbr={favoriteTeamAbbr}
          />
        ))
      ) : (
        <LockedSeriesCard label={title} body={lockedBody ?? "Matchup coming soon"} />
      )}
    </div>
  );
}

function getConferenceRoundColumns(series: SeriesInfo[]) {
  const byRound = (round: string) =>
    series
      .filter((item) => item.round === round)
      .sort((a, b) => getSeriesUrgencyRank(a) - getSeriesUrgencyRank(b));

  const firstRound = byRound("First Round");
  const semifinals = byRound("Second Round");
  const confFinals = byRound("Conf Finals");
  const hasAnySeries = firstRound.length > 0 || semifinals.length > 0 || confFinals.length > 0;

  const columns: {
    key: string;
    title: string;
    series: SeriesInfo[];
    lockedBody?: string;
  }[] = [];

  if (firstRound.length > 0) {
    columns.push({
      key: "first",
      title: "First Round",
      series: firstRound,
    });
  }

  if (semifinals.length > 0) {
    columns.push({
      key: "semis",
      title: "Semifinals",
      series: semifinals,
    });
  } else if (firstRound.length > 0) {
    columns.push({
      key: "semis-locked",
      title: "Semifinals",
      series: [],
      lockedBody: "First-round winners slot in here.",
    });
  }

  if (confFinals.length > 0) {
    columns.push({
      key: "finals",
      title: "Conference Finals",
      series: confFinals,
    });
  } else if (hasAnySeries) {
    columns.push({
      key: "finals-locked",
      title: "Conference Finals",
      series: [],
      lockedBody: "Semifinal winners slot in here.",
    });
  }

  return columns;
}

function BracketConferenceSection({
  conference,
  series,
  favoriteTeamAbbr,
}: {
  conference: "East" | "West";
  series: SeriesInfo[];
  favoriteTeamAbbr: string | null;
}) {
  const columns = getConferenceRoundColumns(series);
  if (!columns.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase text-[#1a1208]">
            {conference}
          </p>
          <p className="text-[0.72rem] font-bold uppercase text-[#a89880]">
            Playoff path
          </p>
        </div>
        <span className="rounded-full bg-[#ede8df] px-3 py-1 font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase text-[#8a7a66] ring-1 ring-[#d4cdc0]">
          {series.length} active
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <BracketRoundColumn
            key={column.key}
            title={column.title}
            series={column.series}
            favoriteTeamAbbr={favoriteTeamAbbr}
            lockedBody={column.lockedBody}
          />
        ))}
      </div>
    </section>
  );
}

function BracketView({
  games,
  favoriteTeamAbbr,
  onBackToScores,
}: {
  games: Game[];
  favoriteTeamAbbr: string | null;
  onBackToScores: () => void;
}) {
  const allSeries = buildBracketSeries(games);

  if (allSeries.length === 0) {
    return <BracketEmptyState onBackToScores={onBackToScores} />;
  }

  const eastSeries = allSeries.filter((series) => series.conference === "East");
  const westSeries = allSeries.filter((series) => series.conference === "West");
  const finals = allSeries.filter(
    (series) => series.round === "NBA Finals" || series.conference === "Finals"
  );
  const unknownSeries = allSeries.filter(
    (series) =>
      series.conference !== "East" &&
      series.conference !== "West" &&
      series.conference !== "Finals" &&
      series.round !== "NBA Finals"
  );
  const hasConferenceSeries = eastSeries.length > 0 || westSeries.length > 0;
  const liveCount = allSeries.filter((series) => series.status === "live").length;
  const upcomingCount = allSeries.filter((series) => series.status === "upcoming").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase text-[#e85d04]">
            NBA Playoffs
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black uppercase text-[#1a1208] sm:text-5xl">
            Playoff Bracket
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#8a7a66]">
            Series cards update from live playoff matchups and the series context already shown on Scores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#1a1208] px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase text-[#f5f1ea]">
            {allSeries.length} series
          </span>
          <span className="rounded-full bg-orange-100 px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase text-orange-800 ring-1 ring-orange-200">
            {liveCount} live
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase text-blue-800 ring-1 ring-blue-200">
            {upcomingCount} upcoming
          </span>
        </div>
      </header>

      <div className="space-y-8">
        <BracketConferenceSection
          conference="East"
          series={eastSeries}
          favoriteTeamAbbr={favoriteTeamAbbr}
        />

        <BracketConferenceSection
          conference="West"
          series={westSeries}
          favoriteTeamAbbr={favoriteTeamAbbr}
        />

        {unknownSeries.length > 0 && (
          <section className="space-y-3">
            <div className="px-1">
              <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase text-[#1a1208]">
                Series View
              </p>
              <p className="text-[0.72rem] font-bold uppercase text-[#a89880]">
                Matchups from available playoff context
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {unknownSeries.map((series) => (
                <SeriesCard
                  key={series.key}
                  series={series}
                  favoriteTeamAbbr={favoriteTeamAbbr}
                />
              ))}
            </div>
          </section>
        )}

        {(finals.length > 0 || hasConferenceSeries) && (
          <section className="space-y-3">
            <div className="px-1 text-center">
              <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase text-[#1a1208]">
                NBA Finals
              </p>
              <p className="text-[0.72rem] font-bold uppercase text-[#a89880]">
                Championship series
              </p>
            </div>
            <div className="mx-auto grid max-w-md grid-cols-1 gap-4">
              {finals.length > 0 ? (
                finals.map((series) => (
                  <SeriesCard
                    key={series.key}
                    series={series}
                    favoriteTeamAbbr={favoriteTeamAbbr}
                  />
                ))
              ) : (
                <LockedSeriesCard
                  label="NBA Finals"
                  body="Conference champions slot in here."
                />
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function NBAApp({ onBack }: { onBack: () => void }) {
  const [games, setGames] = useState<Game[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState<"scores" | "bracket" | "team">("scores");
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
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // TEN: 10 s polling when any game is live, 30 s otherwise
    let hasLiveGames = false;

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

          // Adjust polling cadence based on whether any game is live
          const nowLive = nextGames.some((g) => g.status === "live");
          if (nowLive !== hasLiveGames) {
            hasLiveGames = nowLive;
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(fetchGames, hasLiveGames ? 10000 : 30000);
          }
        }
      } catch {
        if (isMounted && !requestController.signal.aborted) {
          setGames([]);
        }
      } finally {
        if (isMounted) setHasLoadedOnce(true);
        isFetching = false;
      }
    }

    fetchGames();
    intervalId = setInterval(fetchGames, 30000);

    return () => {
      isMounted = false;
      controller?.abort();
      if (intervalId) clearInterval(intervalId);

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
      if (activeTab === "team") {
        setActiveTab("scores");
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-[#a89880] transition hover:text-[#1a1208] active:scale-95"
              aria-label="Back to sports"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              <span className="text-[0.68rem] font-bold uppercase tracking-wide">Sports</span>
            </button>
            <span className="text-[#d4cdc0]">·</span>
            <div className="flex items-center gap-1.5">
              <img src="/favicon.svg" alt="No Noise Scores logo" className="h-5 w-5" />
              <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-tight text-[#1a1208]">
                NBA
              </span>
            </div>
          </div>

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
          {favoriteTeamAbbr && (
            <button
              type="button"
              onClick={() => setActiveTab("team")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                activeTab === "team"
                  ? "bg-[#1a1208] text-[#f5f1ea]"
                  : "text-[#8a7a66]"
              }`}
            >
              {favoriteTeamAbbr}
            </button>
          )}
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

        {activeTab === "team" && favoriteTeamAbbr && (
          <TeamView
            games={games}
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
          />
        )}

        {activeTab === "bracket" && (
          <BracketView
            games={games}
            favoriteTeamAbbr={favoriteTeamAbbr}
            onBackToScores={() => setActiveTab("scores")}
          />
        )}
      </div>
    </main>
  );
}

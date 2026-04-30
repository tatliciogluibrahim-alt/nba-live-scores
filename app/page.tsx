"use client";

import { useEffect, useMemo, useState } from "react";

type GameStatus = "all" | "live" | "upcoming" | "final";

type Team = {
  name: string;
  abbreviation: string;
  score: number;
};

type Game = {
  id: string;
  date: string;
  status: Exclude<GameStatus, "all">;
  statusText: string;
  matchup: string;
  home: Team;
  away: Team;
};

function formatGameDateTime(date: string) {
  const gameDate = new Date(date);

  const day = gameDate.toLocaleDateString([], {
    weekday: "short",
  });

  const time = gameDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${day} • ${time}`;
}

function getStatusClasses(status: Game["status"]) {
  if (status === "live") {
    return "bg-orange-100 text-orange-800 ring-orange-200";
  }

  if (status === "final") {
    return "bg-slate-200 text-slate-700 ring-slate-300";
  }

  return "bg-blue-100 text-blue-800 ring-blue-200";
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
  if (game.status === "final") {
    return "bg-emerald-600 text-white";
  }

  return "bg-orange-500 text-white";
}

function sortGamesForDisplay(gamesToSort: Game[]) {
  const statusRank = {
    live: 0,
    upcoming: 1,
    final: 2,
  };

  return [...gamesToSort].sort((a, b) => {
    const statusDifference = statusRank[a.status] - statusRank[b.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();

    // Live and upcoming games: soonest first.
    if (a.status === "live" || a.status === "upcoming") {
      return aTime - bTime;
    }

    // Final games: most recent first.
    return bTime - aTime;
  });
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-orange-500 text-white shadow-lg shadow-orange-950/20"
          : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
      }`}
    >
      {label} <span className="opacity-75">{count}</span>
    </button>
  );
}

function TeamLine({
  game,
  side,
}: {
  game: Game;
  side: "away" | "home";
}) {
  const team = game[side];
  const showScore = game.status !== "upcoming";
  const edgeLabel = getTeamEdgeLabel(game, side);

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-lg font-black tracking-tight text-slate-950">
            {team.abbreviation}
          </p>

          {edgeLabel && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${getTeamEdgeClasses(
                game
              )}`}
            >
              {edgeLabel}
            </span>
          )}
        </div>

        <p className="truncate text-xs font-medium text-slate-500">
          {team.name}
        </p>
      </div>

      <div className="ml-4 text-3xl font-black tabular-nums tracking-tight text-slate-950">
        {showScore ? team.score : "–"}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  return (
    <article className="rounded-[1.7rem] bg-white p-4 text-slate-950 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200/70">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-wide ring-1 ${getStatusClasses(
            game.status
          )}`}
        >
          {game.status === "live" && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-600" />
          )}
          {getStatusLabel(game.status)}
        </div>

        <div className="text-right">
          <p className="text-base font-black leading-none text-slate-950">
            {game.status === "live"
              ? game.statusText
              : formatGameDateTime(game.date)}
          </p>

          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            {game.matchup}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
        <TeamLine game={game} side="away" />

        <div className="h-px bg-slate-200" />

        <TeamLine game={game} side="home" />
      </div>
    </article>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<GameStatus>("all");

  async function fetchGames() {
    setLoading(true);

    try {
      const response = await fetch("/api/live-scores");

      if (!response.ok) {
        throw new Error("Could not fetch games");
      }

      const data = await response.json();

      setGames(data.games);
      setLastUpdated(new Date());
    } catch {
      setGames([]);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGames();

    const interval = setInterval(() => {
      fetchGames();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredGames = useMemo(() => {
    const selectedGames =
      activeFilter === "all"
        ? games
        : games.filter((game) => game.status === activeFilter);

    return sortGamesForDisplay(selectedGames);
  }, [games, activeFilter]);

  const counts = useMemo(() => {
    return games.reduce(
      (total, game) => {
        total.all += 1;
        total[game.status] += 1;
        return total;
      },
      { all: 0, live: 0, upcoming: 0, final: 0 }
    );
  }, [games]);

  const filterOptions: { label: string; value: GameStatus; count: number }[] = [
    { label: "All", value: "all", count: counts.all },
    { label: "Live", value: "live", count: counts.live },
    { label: "Upcoming", value: "upcoming", count: counts.upcoming },
    { label: "Final", value: "final", count: counts.final },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1e3a8a_0,#0f172a_34%,#020617_78%)] px-4 py-5 text-white sm:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 overflow-hidden rounded-[2rem] bg-white text-slate-950 shadow-2xl shadow-black/25">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-white to-orange-50 p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                NBA this week
              </div>

              <button
                onClick={fetchGames}
                disabled={loading}
                className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? "Refreshing" : "Refresh"}
              </button>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
                  NBA scores,
                  <br />
                  without the noise.
                </h1>

                <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                  Check the week’s games, then filter instantly for live,
                  upcoming, or final scores.
                </p>
              </div>

              <div className="hidden rounded-3xl bg-slate-950 px-5 py-4 text-right text-white lg:block">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                  Games this week
                </p>
                <p className="mt-1 text-4xl font-black">{counts.all}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <FilterPill
              key={option.value}
              label={option.label}
              count={option.count}
              active={activeFilter === option.value}
              onClick={() => setActiveFilter(option.value)}
            />
          ))}
        </section>

        <div className="mb-5 flex flex-col gap-1 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/75 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "Fetching games"}
          </div>

          <div>Times shown in your local timezone</div>
        </div>

        {filteredGames.length > 0 ? (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </section>
        ) : (
          <section className="rounded-[1.75rem] bg-white p-8 text-center text-slate-950 shadow-xl shadow-black/20">
            <p className="text-2xl font-black tracking-tight">
              No games found for this filter.
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Try switching to All, Upcoming, Live, or Final.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
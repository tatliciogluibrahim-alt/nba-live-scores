"use client";

import { useEffect, useMemo, useState } from "react";

type GameStatus = "all" | "live" | "upcoming" | "final";

type Team = {
  name: string;
  abbreviation: string;
  score: number;
  logo: string;
};

type Game = {
  id: string;
  date: string;
  status: Exclude<GameStatus, "all">;
  statusText: string;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
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

    if (a.status === "live" || a.status === "upcoming") {
      return aTime - bTime;
    }

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
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-orange-500 text-white shadow-lg shadow-orange-950/20"
          : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
      }`}
    >
      {label} <span className="opacity-75">{count}</span>
    </button>
  );
}

function TeamLogo({ team }: { team: Team }) {
  if (!team.logo) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600">
        {team.abbreviation}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-orange-100">
      <img
        src={team.logo}
        alt=""
        className="h-6 w-6 object-contain"
        loading="lazy"
      />
    </div>
  );
}

function TeamLine({ game, side }: { game: Game; side: "away" | "home" }) {
  const team = game[side];
  const showScore = game.status !== "upcoming";
  const edgeLabel = getTeamEdgeLabel(game, side);

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo team={team} />

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
      </div>

      <div className="ml-4 text-3xl font-black tabular-nums tracking-tight text-slate-950">
        {showScore ? team.score : "–"}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  return (
    <article className="rounded-[1.7rem] bg-[#fffaf2] p-4 text-slate-950 shadow-xl shadow-black/15 ring-1 ring-orange-100/70">
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

      <div className="rounded-2xl bg-white/85 px-4 py-2 ring-1 ring-orange-100/80">
        <TeamLine game={game} side="away" />

        <div className="h-px bg-orange-100/70" />

        <TeamLine game={game} side="home" />
      </div>

      {(game.gameContext || game.seriesSummary) && (
        <div className="mt-3 space-y-2">
          {game.gameContext && (
            <div className="rounded-2xl bg-[#fff1df] px-3 py-2 text-xs font-black uppercase tracking-wide text-orange-800 ring-1 ring-orange-200/80">
              {game.gameContext}
            </div>
          )}

          {game.seriesSummary && (
            <div className="rounded-2xl bg-[#07111f] px-3 py-2 text-xs font-black uppercase tracking-wide text-white ring-1 ring-white/10">
              {game.seriesSummary}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
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
      setHasLoadedOnce(true);
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

  const sponsorName = "Ibra-Heem";
  const sponsorUrl = "https://open.spotify.com/artist/1yNArQC2GYbKr3M7H7vpXo";

  const hasPlayoffCoverage = games.some(
    (game) => game.gameContext || game.seriesSummary
  );

  const sponsorPrefix = hasPlayoffCoverage
    ? "Playoff coverage by"
    : "Presented by";

  return (
    <main className="min-h-screen bg-[#07111f] bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.20),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_44px)] px-4 py-5 text-white sm:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 overflow-hidden rounded-[2rem] bg-[#fff8ef] text-slate-950 shadow-2xl shadow-black/30 ring-1 ring-white/40">
          <div className="border-b border-orange-100/70 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,#fffaf2,#ffffff_55%,#fff3e4)] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#07111f] px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
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

              <div className="hidden rounded-3xl bg-[#07111f] px-5 py-4 text-right text-white lg:block">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                  Games this week
                </p>
                <p className="mt-1 text-4xl font-black">{counts.all}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-20 mb-4 -mx-4 border-y border-white/10 bg-[#07111f]/82 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-0">
          <section className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
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
        </div>

        <div className="mb-5 flex flex-col gap-1 rounded-2xl bg-[#101d33]/90 px-4 py-3 text-sm text-white/75 shadow-lg shadow-black/10 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Fetching games"}
          </div>

          <div className="font-semibold text-white/85">
            {sponsorPrefix}{" "}
            <a
              href={sponsorUrl}
              target="_blank"
              rel="noreferrer"
              className="font-black text-white underline decoration-orange-400 decoration-2 underline-offset-4 transition hover:text-orange-200"
            >
              {sponsorName}
            </a>
          </div>
        </div>

        {filteredGames.length > 0 ? (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </section>
        ) : !hasLoadedOnce ? (
          <section className="rounded-[1.75rem] bg-[#fffaf2] p-8 text-center text-slate-950 shadow-xl shadow-black/20 ring-1 ring-orange-100/70">
            <p className="text-2xl font-black tracking-tight">
              Loading this week’s games...
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pulling the latest scoreboard.
            </p>
          </section>
        ) : (
          <section className="rounded-[1.75rem] bg-[#fffaf2] p-8 text-center text-slate-950 shadow-xl shadow-black/20 ring-1 ring-orange-100/70">
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
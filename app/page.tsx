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

const fallbackGames: Game[] = [
  {
    id: "demo-1",
    date: new Date().toISOString(),
    status: "live",
    statusText: "Q3 · 04:18",
    matchup: "BOS @ NYK",
    home: { name: "New York Knicks", abbreviation: "NYK", score: 88 },
    away: { name: "Boston Celtics", abbreviation: "BOS", score: 92 },
  },
  {
    id: "demo-2",
    date: new Date().toISOString(),
    status: "upcoming",
    statusText: "8:30 PM",
    matchup: "LAL @ GSW",
    home: { name: "Golden State Warriors", abbreviation: "GSW", score: 0 },
    away: { name: "Los Angeles Lakers", abbreviation: "LAL", score: 0 },
  },
  {
    id: "demo-3",
    date: new Date(Date.now() - 86400000).toISOString(),
    status: "final",
    statusText: "Final",
    matchup: "MIA @ PHI",
    home: { name: "Philadelphia 76ers", abbreviation: "PHI", score: 99 },
    away: { name: "Miami Heat", abbreviation: "MIA", score: 104 },
  },
];

function formatGameDate(date: string) {
  return new Date(date).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getStatusClasses(status: Game["status"]) {
  if (status === "live") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (status === "final") {
    return "bg-slate-200 text-slate-700 ring-slate-300";
  }

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function getStatusLabel(status: Game["status"]) {
  if (status === "live") return "LIVE";
  if (status === "final") return "FINAL";
  return "UPCOMING";
}

function ScoreRow({
  team,
  isLeading,
  showScore,
}: {
  team: Team;
  isLeading: boolean;
  showScore: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-slate-950 shadow-sm ring-1 ring-slate-200/70">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-black tracking-tight">
            {team.abbreviation}
          </p>

          {isLeading && showScore && (
            <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              Lead
            </span>
          )}
        </div>

        <p className="truncate text-sm font-medium text-slate-500">
          {team.name}
        </p>
      </div>

      <div className="ml-4 text-5xl font-black leading-none tabular-nums tracking-tight">
        {showScore ? team.score : "–"}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const showScore = game.status !== "upcoming";
  const homeLeading = game.home.score > game.away.score;
  const awayLeading = game.away.score > game.home.score;

  return (
    <article className="rounded-[1.75rem] bg-slate-100 p-4 text-slate-950 shadow-sm ring-1 ring-white/10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ring-1 ${getStatusClasses(
            game.status
          )}`}
        >
          {game.status === "live" && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          )}
          {getStatusLabel(game.status)}
        </div>

        <div className="text-right">
          <p className="text-xl font-black tracking-tight">{game.statusText}</p>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {formatGameDate(game.date)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <ScoreRow
          team={game.away}
          isLeading={awayLeading}
          showScore={showScore}
        />
        <ScoreRow
          team={game.home}
          isLeading={homeLeading}
          showScore={showScore}
        />
      </div>
    </article>
  );
}

export default function Home() {
  const [realGames, setRealGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<GameStatus>("all");

  async function fetchGames() {
    setLoading(true);

    try {
      const response = await fetch("/api/live-scores");

      if (!response.ok) {
        throw new Error("Could not fetch games");
      }

      const data = await response.json();

      setRealGames(data.games);
      setLastUpdated(new Date());
    } catch {
      setRealGames([]);
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

  const sourceGames = demoMode ? fallbackGames : realGames;

  const filteredGames = useMemo(() => {
    if (activeFilter === "all") return sourceGames;
    return sourceGames.filter((game) => game.status === activeFilter);
  }, [sourceGames, activeFilter]);

  const counts = useMemo(() => {
    return sourceGames.reduce(
      (total, game) => {
        total.all += 1;
        total[game.status] += 1;
        return total;
      },
      { all: 0, live: 0, upcoming: 0, final: 0 }
    );
  }, [sourceGames]);

  const filterOptions: { label: string; value: GameStatus; count: number }[] = [
    { label: "All", value: "all", count: counts.all },
    { label: "Live", value: "live", count: counts.live },
    { label: "Upcoming", value: "upcoming", count: counts.upcoming },
    { label: "Final", value: "final", count: counts.final },
  ];

  return (
    <main className="min-h-screen bg-[#050814] px-4 py-5 text-white sm:px-6 md:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-4 rounded-[1.75rem] bg-white p-5 text-slate-950 shadow-xl shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              NBA this week
            </div>

            <button
              onClick={() => setDemoMode((current) => !current)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                demoMode
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-slate-100 text-slate-950 hover:bg-slate-200"
              }`}
            >
              {demoMode ? "Hide demo" : "Show demo"}
            </button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black leading-none tracking-tight sm:text-5xl">
                Scores this week.
                <br />
                Live when it matters.
              </h1>

              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Check NBA games across the week, then filter for live, upcoming,
                or final scores.
              </p>
            </div>

            <button
              onClick={fetchGames}
              disabled={loading}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        {demoMode && (
          <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 ring-1 ring-red-400/20">
            Demo mode is on. These are sample games for previewing the design.
          </div>
        )}

        <section className="mb-4 grid grid-cols-4 gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              className={`rounded-2xl px-3 py-3 text-left transition ${
                activeFilter === option.value
                  ? "bg-white text-slate-950"
                  : "bg-white/10 text-white ring-1 ring-white/10"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-wide opacity-60">
                {option.label}
              </p>
              <p className="mt-1 text-2xl font-black">{option.count}</p>
            </button>
          ))}
        </section>

        <div className="mb-4 flex flex-col gap-1 rounded-3xl bg-white/10 px-4 py-3 text-sm font-medium text-white/65 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "Fetching games"}
          </div>

          <div>{demoMode ? "Demo preview" : "Connected to live feed"}</div>
        </div>

        {filteredGames.length > 0 ? (
          <section className="grid gap-4">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </section>
        ) : (
          <section className="rounded-[1.75rem] bg-white p-8 text-center text-slate-950 shadow-xl shadow-black/20">
            <p className="text-2xl font-black tracking-tight">
              No games found for this filter.
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Try switching to All, Upcoming, Live, or Final.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
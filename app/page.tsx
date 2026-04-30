"use client";

import { useEffect, useMemo, useState } from "react";

type Team = {
  name: string;
  abbreviation: string;
  score: number;
};

type LiveGame = {
  id: string;
  statusText: string;
  home: Team;
  away: Team;
};

const fallbackLiveGames: LiveGame[] = [
  {
    id: "demo-1",
    statusText: "Q3 · 04:18",
    home: { name: "New York Knicks", abbreviation: "NYK", score: 88 },
    away: { name: "Boston Celtics", abbreviation: "BOS", score: 92 },
  },
  {
    id: "demo-2",
    statusText: "Q2 · 09:41",
    home: { name: "Golden State Warriors", abbreviation: "GSW", score: 45 },
    away: { name: "Los Angeles Lakers", abbreviation: "LAL", score: 51 },
  },
];

function ScoreRow({
  team,
  isLeading,
}: {
  team: Team;
  isLeading: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-slate-950 shadow-sm ring-1 ring-slate-200/70">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-black tracking-tight">{team.abbreviation}</p>
          {isLeading && (
            <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              Lead
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium text-slate-500">{team.name}</p>
      </div>

      <div className="ml-4 text-5xl font-black leading-none tabular-nums tracking-tight">
        {team.score}
      </div>
    </div>
  );
}

function LiveGameCard({ game }: { game: LiveGame }) {
  const homeLeading = game.home.score > game.away.score;
  const awayLeading = game.away.score > game.home.score;

  return (
    <article className="rounded-[1.75rem] bg-slate-100 p-4 text-slate-950 shadow-sm ring-1 ring-white/10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-black text-red-700 ring-1 ring-red-100">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          LIVE
        </div>

        <div className="text-right">
          <p className="text-xl font-black tracking-tight">{game.statusText}</p>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Score
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <ScoreRow team={game.away} isLeading={awayLeading} />
        <ScoreRow team={game.home} isLeading={homeLeading} />
      </div>
    </article>
  );
}

export default function Home() {
  const [realGames, setRealGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  async function fetchLiveScores() {
    setLoading(true);

    try {
      const response = await fetch("/api/live-scores");

      if (!response.ok) {
        throw new Error("Could not fetch live scores");
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
    fetchLiveScores();

    const interval = setInterval(() => {
      fetchLiveScores();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const games = demoMode ? fallbackLiveGames : realGames;

  const gameCountText = useMemo(() => {
    if (games.length === 1) return "1 live game";
    return `${games.length} live games`;
  }, [games.length]);

  return (
    <main className="min-h-screen bg-[#050814] px-4 py-5 text-white sm:px-6 md:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-4 rounded-[1.75rem] bg-white p-5 text-slate-950 shadow-xl shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              NBA live only
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
                Live games.
                <br />
                Nothing else.
              </h1>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                A fast live scoreboard that only shows NBA games currently in
                progress.
              </p>
            </div>

            <button
              onClick={fetchLiveScores}
              disabled={loading}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        {demoMode && (
          <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 ring-1 ring-red-400/20">
            Demo mode is on. These are sample scores for previewing the design.
          </div>
        )}

        <section className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
            <p className="text-xs font-black uppercase tracking-wide text-white/45">
              Games showing
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight">
              {gameCountText}
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
            <p className="text-xs font-black uppercase tracking-wide text-white/45">
              Refresh
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight">10 sec</p>
          </div>
        </section>

        <div className="mb-4 flex flex-col gap-1 rounded-3xl bg-white/10 px-4 py-3 text-sm font-medium text-white/65 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "Fetching live scores"}
          </div>

          <div>{demoMode ? "Demo preview" : "Connected to live feed"}</div>
        </div>

        {games.length > 0 ? (
          <section className="grid gap-4">
            {games.map((game) => (
              <LiveGameCard key={game.id} game={game} />
            ))}
          </section>
        ) : (
          <section className="rounded-[1.75rem] bg-white p-8 text-center text-slate-950 shadow-xl shadow-black/20">
            <p className="text-2xl font-black tracking-tight">
              No NBA games are live right now.
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Upcoming and final games are intentionally hidden.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
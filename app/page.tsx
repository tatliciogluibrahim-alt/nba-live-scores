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
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 text-slate-950 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-black">{team.abbreviation}</p>
          {isLeading && (
            <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-bold text-white">
              LEAD
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{team.name}</p>
      </div>

      <div className="text-5xl font-black tabular-nums">{team.score}</div>
    </div>
  );
}

function LiveGameCard({ game }: { game: LiveGame }) {
  const homeLeading = game.home.score > game.away.score;
  const awayLeading = game.away.score > game.home.score;

  return (
    <div className="rounded-3xl bg-slate-100 p-5 text-slate-950">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          LIVE
        </div>

        <div className="text-right">
          <p className="text-lg font-black">{game.statusText}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Real-time score
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <ScoreRow team={game.away} isLeading={awayLeading} />
        <ScoreRow team={game.home} isLeading={homeLeading} />
      </div>
    </div>
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
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-[2rem] bg-white p-6 text-slate-950 shadow-xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white">
                NBA live scores only
              </div>

              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                Live games. Nothing else.
              </h1>

              <p className="mt-3 max-w-2xl text-base text-slate-600 md:text-lg">
                A stripped-down prototype that only shows NBA games currently in
                progress and refreshes every 10 seconds.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <button
                onClick={() => setDemoMode((current) => !current)}
                className={`rounded-2xl px-5 py-4 font-bold ${
                  demoMode
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-slate-200 text-slate-950 hover:bg-slate-300"
                }`}
              >
                {demoMode ? "Hide demo" : "Show demo"}
              </button>

              <button
                onClick={fetchLiveScores}
                disabled={loading}
                className="rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        {demoMode && (
          <div className="mb-6 rounded-3xl bg-red-500/10 p-4 text-sm font-bold text-red-100 ring-1 ring-red-400/20">
            Demo mode is on. These are sample scores for previewing the design.
            Real live-score data is hidden until you turn demo mode off.
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white/10 p-5">
            <p className="text-sm font-semibold text-white/60">Status</p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-black">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              Live
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5">
            <p className="text-sm font-semibold text-white/60">
              Games showing
            </p>
            <p className="mt-2 text-3xl font-black">{gameCountText}</p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5">
            <p className="text-sm font-semibold text-white/60">
              Update cadence
            </p>
            <p className="mt-2 text-3xl font-black">10 sec</p>
          </div>
        </section>

        <div className="mb-6 flex flex-col gap-3 rounded-3xl bg-white/10 p-4 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
          <div>
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "Fetching live scores..."}
          </div>

          <div>{demoMode ? "Demo preview" : "Connected to live feed"}</div>
        </div>

        {games.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2">
            {games.map((game) => (
              <LiveGameCard key={game.id} game={game} />
            ))}
          </section>
        ) : (
          <section className="rounded-[2rem] bg-white p-10 text-center text-slate-950 shadow-xl">
            <p className="text-3xl font-black">
              No NBA games are live right now.
            </p>
            <p className="mt-3 text-slate-500">
              Upcoming and final games are intentionally hidden.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
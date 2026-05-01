"use client";

import { useEffect, useMemo, useState } from "react";

type Team = {
  name: string;
  abbreviation: string;
  score: number;
  logo: string;
};

type Game = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  home: Team;
  away: Team;
};

type ApiResponse = {
  games: Game[];
  count: number;
  updatedAt: string;
  error?: string;
};

type ScopeFilter = "today" | "week";
type StatusFilter = "all" | "live" | "upcoming" | "final";

const POLL_INTERVAL = 30000;

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [scope, setScope] = useState<ScopeFilter>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchGames = async () => {
      try {
        const response = await fetch("/api/live-scores", { cache: "no-store" });
        const data: ApiResponse = await response.json();

        if (!mounted) return;
        setGames(Array.isArray(data.games) ? data.games : []);
      } catch (error) {
        console.error("Failed to fetch games", error);
        if (!mounted) return;
        setGames([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchGames();
    const interval = setInterval(fetchGames, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const todayGames = useMemo(() => {
    return games.filter((game) => isSameLocalDay(game.date, new Date()));
  }, [games]);

  const weekGames = useMemo(() => games, [games]);

  const scopedGames = scope === "today" ? todayGames : weekGames;

  const filteredGames = useMemo(() => {
    if (statusFilter === "all") return scopedGames;
    return scopedGames.filter((game) => game.status === statusFilter);
  }, [scopedGames, statusFilter]);

  const liveGames = filteredGames.filter((game) => game.status === "live");
  const upcomingGames = filteredGames.filter((game) => game.status === "upcoming");
  const finalGames = filteredGames.filter((game) => game.status === "final");

  const groupedUpcoming = groupGamesByDay(upcomingGames);
  const groupedFinal = groupGamesByDay(finalGames);

  const todayCounts = getCounts(todayGames);
  const weekCounts = getCounts(weekGames);
  const activeCounts = scope === "today" ? todayCounts : weekCounts;

  return (
    <main className="min-h-screen bg-[#02122d] text-white">
      <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <Hero />

        <div className="sticky top-0 z-30 mt-6 rounded-[24px] border border-white/10 bg-[linear-gradient(90deg,rgba(2,18,45,0.98),rgba(0,18,52,0.98))] backdrop-blur">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                active={scope === "today"}
                onClick={() => setScope("today")}
                label={`TODAY ${todayGames.length}`}
              />
              <FilterPill
                active={scope === "week"}
                onClick={() => setScope("week")}
                label={`WEEK ${weekGames.length}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
                label={`ALL ${activeCounts.all}`}
              />
              <FilterPill
                active={statusFilter === "live"}
                onClick={() => setStatusFilter("live")}
                label={`LIVE ${activeCounts.live}`}
              />
              <FilterPill
                active={statusFilter === "upcoming"}
                onClick={() => setStatusFilter("upcoming")}
                label={`UPCOMING ${activeCounts.upcoming}`}
              />
              <FilterPill
                active={statusFilter === "final"}
                onClick={() => setStatusFilter("final")}
                label={`FINAL ${activeCounts.final}`}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-lg text-white/70">
            Loading scores...
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-2xl font-semibold text-white">No games found.</p>
            <p className="mt-2 text-white/60">Try switching filters or scope.</p>
          </div>
        ) : (
          <>
            {liveGames.length > 0 && (
              <section className="mt-10">
                <SectionHeader
                  eyebrow="REAL-TIME SCORES"
                  title="LIVE NOW"
                  count={`${liveGames.length} ${liveGames.length === 1 ? "GAME" : "GAMES"}`}
                />

                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {liveGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </section>
            )}

            {Object.entries(groupedUpcoming).map(([label, items]) => (
              <section key={`upcoming-${label}`} className="mt-10">
                <SectionHeader
                  eyebrow="UPCOMING GAMES"
                  title={label.toUpperCase()}
                  count={`${items.length} ${items.length === 1 ? "GAME" : "GAMES"}`}
                />

                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {items.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </section>
            ))}

            {Object.entries(groupedFinal).map(([label, items]) => (
              <section key={`final-${label}`} className="mt-10">
                <SectionHeader
                  eyebrow="FINAL SCORES"
                  title={label.toUpperCase()}
                  count={`${items.length} ${items.length === 1 ? "GAME" : "GAMES"}`}
                />

                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {items.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </main>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden rounded-[34px] border border-[#d8d2ca] bg-[linear-gradient(90deg,#f4f1eb_0%,#f2efe9_68%,#f4dfd0_100%)] px-6 py-7 shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:px-7 sm:py-8 lg:px-8 lg:py-9">
      <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center">
        <div>
          <h1 className="max-w-[540px] text-[3rem] font-black uppercase leading-[0.92] tracking-[-0.04em] text-[#000c30] sm:text-[4rem] lg:text-[5rem]">
            NBA SCORES,
            <br />
            NO NOISE.
          </h1>

          <p className="mt-5 text-[18px] font-medium text-[#6e7f9c] sm:text-[20px]">
            Sponsored by{" "}
            <a
              href="https://open.spotify.com/artist/1yNArQC2GYbKr3M7H7vpXo"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#0c1a36] underline decoration-[#f57b20] decoration-2 underline-offset-4"
            >
              Ibra-Heem
            </a>
          </p>
        </div>

        <div className="flex items-center justify-start lg:justify-end">
          <div className="flex items-center gap-4 rounded-[28px] bg-[#02122d] px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-[#041735] shadow-inner">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-[#04112d] text-[28px] text-[#ff7a18]">
                ⊛
              </div>
            </div>

            <div className="text-[30px] font-black uppercase leading-[0.92] tracking-[-0.03em] text-[#ff7a18]">
              NO NOISE
              <br />
              SCORES
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[14px] font-black uppercase tracking-[0.24em] text-[#f0b36d]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-[2.5rem] font-black uppercase leading-none tracking-[-0.04em] text-white sm:text-[3.25rem]">
          {title}
        </h2>
      </div>

      <div className="pb-2 text-[14px] font-black uppercase tracking-[0.22em] text-white/45">
        {count}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const isFinal = game.status === "final";

  const leader = getLeader(game);
  const startTime = formatGameTime(game.date);
  const matchup = game.matchup;
  const topLine = isLive
    ? `Live now · ${game.statusText}`
    : isUpcoming
    ? getUpcomingSubtext(game.date)
    : "Final";

  return (
    <article
      className={`rounded-[30px] border bg-[#f4f1eb] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.2)] sm:p-5 ${
        isLive ? "border-[#f57b20] border-[3px]" : "border-[#d7d1c9]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <StatusBadge status={game.status} />

        <div className="text-right">
          <div className="text-[2.2rem] font-black uppercase leading-none tracking-[-0.04em] text-[#000c30] sm:text-[2.7rem]">
            {isLive ? game.statusText : startTime}
          </div>
          <div className="mt-1 text-[13px] font-black uppercase tracking-[0.22em] text-[#72829d]">
            {matchup}
          </div>
        </div>
      </div>

      <div className="mt-4 text-[18px] font-semibold text-[#71819d]">{topLine}</div>

      <div className="mt-4 rounded-[24px] border border-[#e5ddd1] bg-[#fbfaf7] px-4 py-3">
        <TeamRow
          team={game.away}
          showLeader={leader === "away"}
          leaderLabel={isFinal ? "WON" : "LEAD"}
        />

        <div className="my-3 border-t border-[#ede3d7]" />

        <TeamRow
          team={game.home}
          showLeader={leader === "home"}
          leaderLabel={isFinal ? "WON" : "LEAD"}
        />
      </div>

      {(game.gameContext || game.seriesSummary) && (
        <div className="mt-4 rounded-[22px] bg-[#02122d] px-4 py-3 text-white">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] font-black uppercase tracking-[0.04em]">
            {game.gameContext && <span className="text-[#f0b36d]">{game.gameContext}</span>}
            {game.seriesSummary && <span className="text-white">{game.seriesSummary}</span>}
          </div>
        </div>
      )}
    </article>
  );
}

function TeamRow({
  team,
  showLeader,
  leaderLabel,
}: {
  team: Team;
  showLeader: boolean;
  leaderLabel: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#eedfcb] bg-white">
          {team.logo ? (
            <img
              src={team.logo}
              alt={team.name}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <span className="text-xs font-bold text-[#001133]">{team.abbreviation}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[1.05rem] font-black uppercase text-[#000c30] sm:text-[1.2rem]">
              {team.abbreviation}
            </span>

            {showLeader && (
              <span className="rounded-full bg-[#f57b20] px-3 py-1 text-[11px] font-black uppercase tracking-[0.05em] text-white">
                {leaderLabel}
              </span>
            )}
          </div>

          <p className="truncate text-[15px] text-[#6f7f9b] sm:text-[16px]">{team.name}</p>
        </div>
      </div>

      <div className="text-[2rem] font-black leading-none tracking-[-0.04em] text-[#000c30] sm:text-[2.4rem]">
        {Number.isFinite(team.score) ? team.score : 0}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Game["status"] }) {
  if (status === "live") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[#efc89b] bg-[#f8efdf] px-4 py-2 text-[14px] font-black uppercase tracking-[0.04em] text-[#b2501d]">
        <span className="h-3 w-3 rounded-full bg-[#e67a37]" />
        LIVE
      </div>
    );
  }

  if (status === "upcoming") {
    return (
      <div className="inline-flex items-center rounded-full border border-[#bcd0f5] bg-[#d9e5f8] px-4 py-2 text-[14px] font-black uppercase tracking-[0.04em] text-[#2749c7]">
        UPCOMING
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-full border border-[#d8dde8] bg-[#eef1f6] px-4 py-2 text-[14px] font-black uppercase tracking-[0.04em] text-[#61708b]">
      FINAL
    </div>
  );
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-3 text-[15px] font-medium uppercase tracking-[0.02em] transition ${
        active
          ? "bg-[#f57b20] text-white shadow-[0_8px_20px_rgba(245,123,32,0.28)]"
          : "bg-white/10 text-white/78 hover:bg-white/14"
      }`}
    >
      {label}
    </button>
  );
}

function getCounts(games: Game[]) {
  return {
    all: games.length,
    live: games.filter((game) => game.status === "live").length,
    upcoming: games.filter((game) => game.status === "upcoming").length,
    final: games.filter((game) => game.status === "final").length,
  };
}

function isSameLocalDay(dateA: string, dateB: Date) {
  const a = new Date(dateA);

  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

function groupGamesByDay(games: Game[]) {
  return games.reduce<Record<string, Game[]>>((acc, game) => {
    const label = getDayLabel(game.date);
    if (!acc[label]) acc[label] = [];
    acc[label].push(game);
    return acc;
  }, {});
}

function getDayLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  if (isSameLocalDay(dateString, now)) return "Today";
  if (isSameLocalDay(dateString, tomorrow)) return "Tomorrow";

  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function formatGameTime(dateString: string) {
  return new Date(dateString)
    .toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase();
}

function getUpcomingSubtext(dateString: string) {
  const now = new Date();
  const start = new Date(dateString);
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) return "Starting soon";

  const totalMinutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `Starts in ${minutes} min`;
  }

  if (minutes === 0) {
    return `Starts in ${hours} hr${hours > 1 ? "s" : ""}`;
  }

  return `Starts in ${hours} hr${hours > 1 ? "s" : ""} ${minutes} min`;
}

function getLeader(game: Game): "home" | "away" | null {
  if (game.status === "upcoming") return null;
  if (game.home.score === game.away.score) return null;
  return game.home.score > game.away.score ? "home" : "away";
}
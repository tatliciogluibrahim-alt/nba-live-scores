"use client";

import { useEffect, useMemo, useState } from "react";

type GameStatus = "all" | "live" | "upcoming" | "final";
type ViewScope = "today" | "week";

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

type GameSection = {
  title: string;
  eyebrow?: string;
  games: Game[];
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

function formatGameTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLocalDateKey(date: string) {
  const gameDate = new Date(date);
  const year = gameDate.getFullYear();
  const month = String(gameDate.getMonth() + 1).padStart(2, "0");
  const day = String(gameDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameLocalDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isTomorrow(date: Date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return isSameLocalDay(date, tomorrow);
}

function getSectionTitle(date: string) {
  const gameDate = new Date(date);
  const today = new Date();

  if (isSameLocalDay(gameDate, today)) return "Today";
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
  if (isSameLocalDay(gameDate, now)) return "Starts tonight";
  if (isTomorrow(gameDate)) return "Tomorrow";

  return "Upcoming";
}

function sortGamesForDisplay(gamesToSort: Game[]) {
  const statusRank = {
    live: 0,
    upcoming: 1,
    final: 2,
  };

  return [...gamesToSort].sort((a, b) => {
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
    const existingGames = groups.get(key) || [];
    groups.set(key, [...existingGames, game]);
  });

  return Array.from(groups.values()).map((sectionGames) => ({
    title: getSectionTitle(sectionGames[0].date),
    eyebrow,
    games: sectionGames,
  }));
}

function buildSections(
  gamesToSection: Game[],
  activeFilter: GameStatus
): GameSection[] {
  if (activeFilter === "live") {
    return gamesToSection.length
      ? [{ title: "Live Now", eyebrow: "Real-time scores", games: gamesToSection }]
      : [];
  }

  if (activeFilter === "upcoming") return groupByDay(gamesToSection, "Upcoming games");
  if (activeFilter === "final") return groupByDay(gamesToSection, "Final scores");

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
        alt=""
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
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 font-[family-name:var(--font-display)] text-[11px] font-black uppercase tracking-wide transition sm:px-4 sm:py-2 sm:text-xs ${
        active
          ? "bg-orange-500 text-white shadow-md shadow-orange-950/20"
          : "bg-white/10 text-white/80 ring-1 ring-white/10 hover:bg-white/15"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
        {typeof count === "number" && (
          <span className={active ? "text-white/90" : "text-white/50"}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

function TeamLine({ game, side }: { game: Game; side: "away" | "home" }) {
  const team = game[side];
  const showScore = game.status !== "upcoming";
  const edgeLabel = getTeamEdgeLabel(game, side);

  return (
    <div className="flex items-center justify-between py-2.5 sm:py-3">
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo team={team} />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-black tracking-tight text-slate-950 sm:text-lg">
              {team.abbreviation}
            </p>

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
    <div className="mt-3 rounded-2xl bg-[#07111f] px-3 py-2.5 text-white ring-1 ring-white/10">
      {game.status === "final" && finalSummary && (
        <p className="font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-emerald-300">
          {finalSummary}
        </p>
      )}

      {game.gameContext && (
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-orange-300">
          {game.gameContext}
        </p>
      )}

      {game.seriesSummary && (
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-white">
          {game.seriesSummary}
        </p>
      )}
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  return (
    <article
      className={`rounded-[1.35rem] bg-[#fffaf2] p-3.5 text-slate-950 shadow-xl shadow-black/15 ring-1 ring-orange-100/70 sm:rounded-[1.65rem] sm:p-4 ${getCardAccentClasses(
        game.status
      )}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
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

          <p className="mt-1.5 text-xs font-bold text-slate-500">
            {getGameSubStatus(game)}
          </p>
        </div>

        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-lg font-black uppercase leading-none tracking-tight text-slate-950 sm:text-xl">
            {game.status === "live"
              ? game.statusText
              : formatGameDateTime(game.date)}
          </p>

          <p className="mt-1 font-[family-name:var(--font-display)] text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {game.matchup}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 px-4 py-2 ring-1 ring-orange-100/80">
        <TeamLine game={game} side="away" />
        <div className="h-px bg-orange-100/70" />
        <TeamLine game={game} side="home" />
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
  activeFilter: GameStatus;
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

function HeroMetaCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#07111f] px-4 py-3 text-white ring-1 ring-white/10">
      <p className="font-[family-name:var(--font-display)] text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function HeroMetaPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full bg-[#07111f] px-3 py-2 text-white ring-1 ring-white/10">
      <p className="font-[family-name:var(--font-display)] text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeFilter, setActiveFilter] = useState<GameStatus>("all");
  const [viewScope, setViewScope] = useState<ViewScope>("today");

  async function fetchGames() {
    try {
      const response = await fetch("/api/live-scores");

      if (!response.ok) throw new Error("Could not fetch games");

      const data = await response.json();
      setGames(data.games);
    } catch {
      setGames([]);
    } finally {
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

  const todayGames = useMemo(() => {
    const today = new Date();
    return games.filter((game) => isSameLocalDay(new Date(game.date), today));
  }, [games]);

  const scopedGames = useMemo(() => {
    return viewScope === "today" ? todayGames : games;
  }, [games, todayGames, viewScope]);

  const filteredGames = useMemo(() => {
    const selectedGames =
      activeFilter === "all"
        ? scopedGames
        : scopedGames.filter((game) => game.status === activeFilter);

    return sortGamesForDisplay(selectedGames);
  }, [scopedGames, activeFilter]);

  const sections = useMemo(() => {
    return buildSections(filteredGames, activeFilter);
  }, [filteredGames, activeFilter]);

  const counts = useMemo(() => {
    return scopedGames.reduce(
      (total, game) => {
        total.all += 1;
        total[game.status] += 1;
        return total;
      },
      { all: 0, live: 0, upcoming: 0, final: 0 }
    );
  }, [scopedGames]);

  const nextGame = useMemo(() => {
    return sortGamesForDisplay(
      games.filter((game) => game.status === "live" || game.status === "upcoming")
    )[0];
  }, [games]);

  const nextTipoffLabel = nextGame
    ? nextGame.status === "live"
      ? `Live now · ${nextGame.matchup}`
      : `Next tipoff · ${formatGameTime(nextGame.date)}`
    : "No upcoming games";

  const nextTipoffTime = nextGame ? formatGameTime(nextGame.date) : "TBD";

  const sponsorName = "Ibra-Heem";
  const sponsorUrl = "https://open.spotify.com/artist/1yNArQC2GYbKr3M7H7vpXo";

  const hasPlayoffCoverage = games.some(
    (game) => game.gameContext || game.seriesSummary
  );

  const sponsorPrefix = hasPlayoffCoverage ? "Coverage by" : "Presented by";

  return (
    <main className="min-h-screen bg-[#07111f] bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.15),transparent_30%)] px-4 pb-28 pt-4 text-white sm:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
       <header className="mb-4 overflow-hidden rounded-[1.65rem] bg-[#fff8ef] text-slate-950 shadow-2xl shadow-black/30 ring-1 ring-white/35 sm:mb-5 sm:rounded-[2rem]">
  <div className="bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_34%),linear-gradient(135deg,#fffaf2,#fffefb_54%,#fff3e4)] p-4 sm:p-6 lg:p-7">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#07111f] px-3 py-1.5 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white sm:text-sm">
          <img
            src="/favicon.svg"
            alt=""
            className="h-4 w-4 rounded-full"
          />
          No Noise Scores
        </div>

        <div className="mt-4 sm:mt-5">
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-[2.7rem] font-black uppercase leading-[0.82] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[5.15rem]">
            NBA scores,
            <br />
            no noise.
          </h1>

          <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-500 sm:mt-4 sm:text-lg sm:leading-8">
            Today first. Full week when you need it.
          </p>
        </div>
      </div>

      <div className="hidden justify-end lg:flex">
        <div className="flex h-40 w-40 items-center justify-center rounded-[2rem] bg-[#07111f] shadow-2xl shadow-orange-950/20 ring-1 ring-white/10">
          <img
            src="/favicon.svg"
            alt="No Noise Scores"
            className="h-24 w-24"
          />
        </div>
      </div>
    </div>
  </div>
</header>

        <div className="sticky top-0 z-20 mb-5 -mx-4 border-y border-white/10 bg-[#06101f]/92 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-2 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                </div>

                <div className="flex gap-2 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-end">
                  <FilterPill
                    label="All"
                    count={counts.all}
                    active={activeFilter === "all"}
                    onClick={() => setActiveFilter("all")}
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

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] leading-5 text-white/60">
                <div>{nextTipoffLabel}</div>

                <div>
                  {sponsorPrefix}{" "}
                  <a
                    href={sponsorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-white/85 underline decoration-orange-400 decoration-2 underline-offset-4 transition hover:text-orange-200"
                  >
                    {sponsorName}
                  </a>
                </div>
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
                    <GameCard key={game.id} game={game} />
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
            nextGame={nextGame}
          />
        )}
      </div>
    </main>
  );
}
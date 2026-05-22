"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, GameFilter } from "./nba/types";
import {
  buildSections,
  gameIncludesTeam,
  getAvailableTeams,
  getNextFavoriteGame,
  getNextUpcomingGame,
  getWinningSide,
  sortGamesForDisplay,
} from "./nba/lib/games";
import { triggerLightHaptic } from "./nba/lib/haptics";
import { formatLastUpdated } from "./nba/lib/time";
import { EmptyState } from "./nba/components/empty-state";
import { GameCard } from "./nba/components/game-card";
import { GameDetailDrawer } from "./nba/components/game-detail-drawer";
import {
  getPulseReason,
  getPulseState,
} from "./nba/components/pulse-primitives";
import { FavoriteTeamPicker, FilterPill } from "./nba/components/score-controls";
import { SectionHeader } from "./nba/components/section-header";
import { SeriesBoard } from "./nba/components/series-board";
import { TeamView } from "./nba/components/team-view";
import { TeamLogo } from "./nba/components/team-logo";
import {
  AppCard,
  Segmented,
  StatusPill,
  TeamRow,
  Tension,
  type StatusTone,
} from "./shared/atoms";

type NbaTab = "scores" | "bracket" | "team";

const FAVORITE_TEAM_STORAGE_KEY = "no-noise-favorite-team";
const OLD_FOLLOWED_TEAM_STORAGE_KEY = "no-noise-followed-team";

// Calm "tonight" hero. Replaces the previous gradient pulse-band + conic
// ring. One AppCard, status pill, two team rows, and a thin Tension meter
// only when live. DESIGN.md — drama only when earned.
function TonightPulseHero({
  game,
  onOpen,
}: {
  game: Game | null;
  onOpen: (game: Game) => void;
}) {
  if (!game) return null;

  const isLive = game.status === "live";
  const pulse = getPulseState(game);
  const winningSide = getWinningSide(game);
  const showScore = game.status !== "upcoming";

  const tone: StatusTone =
    game.status === "live" ? "live" : game.status === "upcoming" ? "upcoming" : "final";
  const accent =
    game.status === "live"
      ? "var(--nba)"
      : game.status === "upcoming"
        ? "var(--up)"
        : undefined;

  const statusLabel = isLive
    ? `Live · ${game.statusText}`
    : game.status === "upcoming"
      ? game.statusText
      : "Final";

  const caption = isLive
    ? getPulseReason(game)
    : game.gameContext || game.seriesSummary || "NBA Playoffs";

  return (
    <button
      type="button"
      onClick={() => onOpen(game)}
      className="mb-4 block w-full text-left transition active:scale-[0.99] sm:mb-6"
    >
      <AppCard accent={accent} padded={false}>
        <div className="px-3.5 py-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <StatusPill tone={tone} breathe={isLive}>
                {statusLabel}
              </StatusPill>
              <span
                className="truncate text-[11px] font-semibold"
                style={{ color: "var(--mute-1)" }}
              >
                {game.matchup}
              </span>
            </div>
          </div>

          <TeamRow
            logo={<TeamLogo team={game.away} />}
            code={game.away.abbreviation}
            name={game.away.name}
            score={showScore ? game.away.score : undefined}
            leading={winningSide === "away"}
            won={game.status === "final" && winningSide === "away"}
          />
          <TeamRow
            logo={<TeamLogo team={game.home} />}
            code={game.home.abbreviation}
            name={game.home.name}
            score={showScore ? game.home.score : undefined}
            leading={winningSide === "home"}
            won={game.status === "final" && winningSide === "home"}
          />

          {isLive ? (
            <div
              className="mt-2.5 rounded-[10px] px-2.5 py-2"
              style={{ background: "var(--cream-2)" }}
            >
              <Tension heat={pulse.heat} label="Tension" />
              <div
                className="mt-1.5 text-[12px] font-medium"
                style={{ color: "var(--ink)" }}
              >
                {caption}
              </div>
            </div>
          ) : (
            <div
              className="mt-2 text-[12px] font-medium"
              style={{ color: "var(--mute-1)" }}
            >
              {caption}
            </div>
          )}
        </div>
      </AppCard>
    </button>
  );
}

export default function NBAApp({ onBack }: { onBack: () => void }) {
  const [games, setGames] = useState<Game[]>([]);
  const [seriesGames, setSeriesGames] = useState<Game[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState<NbaTab>("scores");
  const [activeFilter, setActiveFilter] = useState<GameFilter>("all");
  const [favoriteTeamAbbr, setFavoriteTeamAbbr] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [changedScoreKeys, setChangedScoreKeys] = useState<Set<string>>(new Set());
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const previousScoresRef = useRef<Map<string, number>>(new Map());
  const scoreAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const nextSeriesGames = (data.seriesGames || data.games || []) as Game[];

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
          setSeriesGames(nextSeriesGames);
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

          const nowLive = nextGames.some((game) => game.status === "live");
          if (nowLive !== hasLiveGames) {
            hasLiveGames = nowLive;
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(fetchGames, hasLiveGames ? 10000 : 30000);
          }
        }
      } catch {
        if (isMounted && !requestController.signal.aborted) {
          setGames([]);
          setSeriesGames([]);
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
    return getNextUpcomingGame(games);
  }, [games]);

  const nextFavoriteGame = useMemo(() => {
    return getNextFavoriteGame({
      games,
      favoriteTeamAbbr,
      lastUpdatedAt,
    });
  }, [games, favoriteTeamAbbr, lastUpdatedAt]);

  const pulseGame = useMemo(() => {
    const displayGames = sortGamesForDisplay(games, favoriteTeamAbbr);

    return (
      displayGames.find((game) => game.status === "live") ??
      nextUpcomingGame ??
      displayGames[0] ??
      null
    );
  }, [games, favoriteTeamAbbr, nextUpcomingGame]);

  return (
    <main className="min-h-[100svh] bg-[#f5f1ea] px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+0.65rem)] text-[#1a1208] sm:px-6 md:pb-36 md:pt-[calc(env(safe-area-inset-top)+2rem)]">
      <style jsx global>{`
        @keyframes no-noise-live-fade {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.55;
          }
        }

        @keyframes no-noise-score-pop {
          0% {
            transform: translateY(0) scale(1);
          }
          20% {
            transform: translateY(-2px) scale(1.04);
            color: #f97316;
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        .no-noise-live-card {
          box-shadow: inset 0 0 0 2px rgba(232, 93, 4, 0.72),
            0 18px 35px rgba(0, 0, 0, 0.15);
        }

        .no-noise-live-fade {
          animation: no-noise-live-fade 1.8s ease-in-out infinite;
        }

        .no-noise-score-pop {
          animation: no-noise-score-pop 0.6s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .no-noise-live-fade,
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

        <div className="mb-3 px-1">
          <Segmented<NbaTab>
            tabs={[
              { value: "scores", label: "Scores" },
              ...(favoriteTeamAbbr
                ? [{ value: "team" as const, label: favoriteTeamAbbr }]
                : []),
              { value: "bracket", label: "Series" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === "scores" && (
          <>
            <TonightPulseHero game={pulseGame} onOpen={setSelectedGame} />

            <div className="mb-5 sm:mb-8">
              <div className="rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1.5 shadow-sm sm:p-2">
                <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:overflow-x-auto sm:[scrollbar-width:none] sm:[-ms-overflow-style:none] sm:[&::-webkit-scrollbar]:hidden">
                    <FilterPill
                      label="Live"
                      count={counts.live}
                      dot="var(--critical)"
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

            <p
              className="mb-4 px-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--mute-2)" }}
            >
              {formatLastUpdated(lastUpdatedAt)}
            </p>

            {sections.length > 0 ? (
              <div className="mx-auto max-w-5xl">
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
                            onOpen={setSelectedGame}
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
            seriesGames={seriesGames}
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
            onGameOpen={setSelectedGame}
          />
        )}

        {activeTab === "bracket" && (
          <SeriesBoard
            games={seriesGames}
            favoriteTeamAbbr={favoriteTeamAbbr}
            onBackToScores={() => setActiveTab("scores")}
          />
        )}
      </div>

      <GameDetailDrawer game={selectedGame} onClose={() => setSelectedGame(null)} />
    </main>
  );
}

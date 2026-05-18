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
  sortGamesForDisplay,
} from "./nba/lib/games";
import { triggerLightHaptic } from "./nba/lib/haptics";
import { formatLastUpdated } from "./nba/lib/time";
import { EmptyState } from "./nba/components/empty-state";
import { GameCard } from "./nba/components/game-card";
import { FavoriteTeamPicker, FilterPill } from "./nba/components/score-controls";
import { SectionHeader } from "./nba/components/section-header";
import { SeriesBoard } from "./nba/components/series-board";
import { TeamView } from "./nba/components/team-view";

type NbaTab = "scores" | "bracket" | "team";

const FAVORITE_TEAM_STORAGE_KEY = "no-noise-favorite-team";
const OLD_FOLLOWED_TEAM_STORAGE_KEY = "no-noise-followed-team";

export default function NBAApp({ onBack }: { onBack: () => void }) {
  const [games, setGames] = useState<Game[]>([]);
  const [seriesGames, setSeriesGames] = useState<Game[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState<NbaTab>("scores");
  const [activeFilter, setActiveFilter] = useState<GameFilter>("all");
  const [favoriteTeamAbbr, setFavoriteTeamAbbr] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [changedScoreKeys, setChangedScoreKeys] = useState<Set<string>>(new Set());

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
            Series
          </button>
        </div>

        {activeTab === "scores" && (
          <>
            <div className="mb-5 sm:mb-8">
              <div className="rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1.5 shadow-sm sm:p-2">
                <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:overflow-x-auto sm:[scrollbar-width:none] sm:[-ms-overflow-style:none] sm:[&::-webkit-scrollbar]:hidden">
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
    </main>
  );
}

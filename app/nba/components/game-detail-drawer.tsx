"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game, GameDetail } from "../types";
import { formatGameDateTime } from "../lib/time";
import { getGameMomentStake } from "../lib/moment-intelligence";
import { MomentStakePill } from "./moment-stake-pill";
import {
  getMomentumSeries,
  getPulseReason,
  getPulseState,
  MomentumSparkline,
  TensionBar,
} from "./pulse-primitives";
import { TeamLogo } from "./team-logo";

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[0.95rem] bg-white px-3 py-2 ring-1 ring-[#e8e0d4]">
      <p className="font-[family-name:var(--font-display)] text-[0.56rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
        {label}
      </p>
      <p className="mt-1 truncate text-[0.82rem] font-black text-[#1a1208]">
        {value}
      </p>
    </div>
  );
}

function ScoreHero({ game }: { game: Game }) {
  const showScore = game.status !== "upcoming";
  const pulse = getPulseState(game);
  const isLive = game.status === "live";
  const momentum = getMomentumSeries(game, 40);

  return (
    <div className="overflow-hidden rounded-[1.35rem] bg-white shadow-xl shadow-black/10 ring-1 ring-[#e8e0d4]">
      <div className="h-[3px] bg-[#e85d04]" />
      <div className="flex items-start justify-between gap-3 border-b border-[#f0ece4] bg-[#fbf8f3] px-3 py-3">
        <div className="flex items-start gap-2">
          {isLive && (
            <span className="no-noise-live-fade rounded-full bg-[#e85d04] px-2.5 py-1 font-[family-name:var(--font-display)] text-[0.56rem] font-black uppercase tracking-[0.12em] text-white">
              Live
            </span>
          )}
          <div>
            <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
              {game.gameContext || "NBA Playoffs"}
            </p>
            <p className="mt-0.5 text-[0.72rem] font-bold text-[#8a7a66]">
              {game.status === "live" ? game.statusText : formatGameDateTime(game.date)}
            </p>
          </div>
        </div>
        <p className="max-w-[6rem] text-right font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase leading-tight tracking-[0.14em] text-[#e85d04]">
          {isLive ? pulse.label : game.status}
        </p>
      </div>
      {(["away", "home"] as const).map((side) => {
        const team = game[side];
        const other = side === "away" ? game.home : game.away;
        const muted = showScore && team.score < other.score;
        return (
          <div
            key={side}
            className={`flex items-center justify-between gap-3 border-b border-[#f0ece4] px-3 py-3 last:border-b-0 ${
              muted ? "opacity-55" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <TeamLogo team={team} />
              <div className="min-w-0">
                <p className="truncate text-[1.05rem] font-black text-[#1a1208]">
                  {team.abbreviation}
                </p>
                <p className="truncate text-[0.68rem] font-semibold text-[#a89880]">
                  {team.name}
                </p>
              </div>
            </div>
            <p className="text-[2.5rem] font-black tabular-nums leading-none tracking-tight text-[#1a1208]">
              {showScore ? team.score : "–"}
            </p>
          </div>
        );
      })}
      {isLive && (
        <div className="space-y-3 px-3 py-3">
          <TensionBar pulse={pulse} />
          <div className="rounded-[1rem] bg-[#fbf8f3] px-3 py-3 ring-1 ring-[#f0ece4]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
                Score momentum
              </p>
              <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#e85d04]">
                {getPulseReason(game)}
              </p>
            </div>
            <MomentumSparkline data={momentum} height={58} />
            <div className="mt-1 flex justify-between text-[0.58rem] font-black uppercase tracking-wide text-[#c0b0a0]">
              <span>{game.home.abbreviation} run</span>
              <span>{game.away.abbreviation} run</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GameDetailDrawer({
  game,
  onClose,
}: {
  game: Game | null;
  onClose: () => void;
}) {
  const [detailState, setDetailState] = useState<{
    gameId: string | null;
    detail: GameDetail | null;
  }>({ gameId: null, detail: null });

  useEffect(() => {
    if (!game) return;

    const activeGame = game;
    const controller = new AbortController();

    async function fetchDetail() {
      try {
        const response = await fetch(`/api/nba-game-detail?event=${activeGame.id}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to fetch game detail");
        const data = (await response.json()) as GameDetail;
        setDetailState({ gameId: activeGame.id, detail: data });
      } catch {
        if (!controller.signal.aborted) {
          setDetailState({
            gameId: activeGame.id,
            detail: {
              broadcasts: [],
              line: null,
              leaders: [],
              teamComparison: [],
              error: "Unable to fetch game detail",
            },
          });
        }
      }
    }

    fetchDetail();

    return () => controller.abort();
  }, [game]);

  useEffect(() => {
    if (!game) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game, onClose]);

  const merged = useMemo(() => {
    if (!game) return null;

    const detail =
      detailState.gameId === game.id ? detailState.detail : null;
    const broadcasts =
      detail?.broadcasts && detail.broadcasts.length > 0
        ? detail.broadcasts
        : game.broadcasts;
    const line = detail?.line ?? game.line;
    const teamComparison =
      detail?.teamComparison && detail.teamComparison.length > 0
        ? detail.teamComparison
        : game.teamComparison;
    const leaders =
      detail?.leaders && detail.leaders.length > 0
        ? detail.leaders
        : game.leaders;

    return { broadcasts, line, teamComparison, leaders };
  }, [detailState, game]);

  if (!game || !merged) return null;

  const isLoading = detailState.gameId !== game.id;
  const stake = getGameMomentStake(game);
  const watchLabel =
    merged.broadcasts.length > 0 ? merged.broadcasts.join(" / ") : "TV TBA";
  const lineLabel = [merged.line?.spread, merged.line?.total]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <section
        className="max-h-[88svh] w-full max-w-xl overflow-hidden rounded-t-[1.75rem] bg-[#f5f1ea] pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:rounded-[1.75rem] sm:pb-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-[#d4cdc0]" />
        </div>

        <div className="border-b border-[#e8e0d4] px-4 pb-3 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#c0b0a0]">
                Game Detail
              </p>
              <p className="mt-1 truncate font-[family-name:var(--font-display)] text-[1.45rem] font-black uppercase leading-none tracking-tight text-[#1a1208]">
                {game.matchup}
              </p>
              <p className="mt-1 text-[0.76rem] font-bold text-[#a89880]">
                {game.status === "live" ? game.statusText : formatGameDateTime(game.date)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#8a7a66] ring-1 ring-[#e8e0d4] transition active:scale-95"
              aria-label="Close game detail"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[calc(88svh-7rem)] space-y-4 overflow-y-auto px-4 py-4">
          <ScoreHero game={game} />

          {stake && <MomentStakePill stake={stake} />}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetailValue label="Watch" value={watchLabel} />
            <DetailValue label="Line" value={lineLabel || "Unavailable"} />
          </div>

          <div className="rounded-[1rem] bg-white ring-1 ring-[#e8e0d4]">
            <div className="border-b border-[#f0ece4] px-3 py-2">
              <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
                Team Comparison
              </p>
            </div>
            {merged.teamComparison.length > 0 ? (
              <div className="divide-y divide-[#f0ece4]">
                {merged.teamComparison.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_4.5rem_1fr] items-center gap-2 px-3 py-2"
                  >
                    <p className="truncate text-[0.78rem] font-black tabular-nums text-[#1a1208]">
                      {row.away}
                    </p>
                    <p className="text-center font-[family-name:var(--font-display)] text-[0.56rem] font-black uppercase tracking-[0.12em] text-[#c0b0a0]">
                      {row.label}
                    </p>
                    <p className="truncate text-right text-[0.78rem] font-black tabular-nums text-[#1a1208]">
                      {row.home}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-3 py-4 text-[0.76rem] font-semibold text-[#a89880]">
                {isLoading ? "Loading stats..." : "Stats unavailable"}
              </p>
            )}
          </div>

          <div className="rounded-[1rem] bg-white ring-1 ring-[#e8e0d4]">
            <div className="border-b border-[#f0ece4] px-3 py-2">
              <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
                Player Leaders
              </p>
            </div>
            {merged.leaders.length > 0 ? (
              <div className="divide-y divide-[#f0ece4]">
                {merged.leaders.map((leader) => (
                  <div
                    key={`${leader.team}-${leader.label}-${leader.name}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8rem] font-black text-[#1a1208]">
                        {leader.name}
                      </p>
                      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-[#a89880]">
                        {leader.team} · {leader.label}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-[0.86rem] font-black tabular-nums text-[#1a1208]">
                      {leader.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-3 py-4 text-[0.76rem] font-semibold text-[#a89880]">
                {isLoading ? "Loading leaders..." : "Player stats unavailable"}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

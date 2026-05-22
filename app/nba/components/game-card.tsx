"use client";

import { useEffect, useState } from "react";
import type { Game } from "../types";
import {
  gameIncludesTeam,
  getFinalSummary,
  getGameSubStatus,
  getTeamEdgeLabel,
  getWinningSide,
} from "../lib/games";
import {
  formatCountdown,
  formatGameDateTime,
} from "../lib/time";
import { getGameMomentStake } from "../lib/moment-intelligence";
import { MomentStakePill } from "./moment-stake-pill";
import {
  getMomentumSeries,
  getPulseReason,
  getPulseState,
  MomentumSparkline,
  TensionBar,
} from "./pulse-primitives";
import { ShareButton, ShareModal } from "./share-card";
import { TeamLogo } from "./team-logo";

function getStatusClasses(status: Game["status"]) {
  if (status === "live") return "bg-orange-100 text-orange-800 ring-orange-200";
  if (status === "final") return "bg-slate-200 text-slate-700 ring-slate-300";
  return "bg-blue-100 text-blue-800 ring-blue-200";
}

function getCardAccentClasses(status: Game["status"]) {
  if (status === "live") return "no-noise-live-card border-t-[3px] border-orange-500";
  if (status === "final") return "border-t-[3px] border-emerald-600";
  return "border-t-[3px] border-blue-500";
}

function getStatusLabel(status: Game["status"]) {
  if (status === "live") return "LIVE";
  if (status === "final") return "FINAL";
  return "UPCOMING";
}

function getTeamEdgeClasses(game: Game) {
  if (game.status === "final") return "bg-emerald-600 text-white";
  return "bg-orange-500 text-white";
}

function CountdownText({ date }: { date: string }) {
  const [label, setLabel] = useState("Starting soon");

  useEffect(() => {
    const updateCountdown = () => {
      setLabel(formatCountdown(date));
    };

    const getInterval = () =>
      new Date(date).getTime() - Date.now() < 300000 ? 1000 : 60000;

    const initialTimeout = setTimeout(updateCountdown, 0);
    const interval = setInterval(updateCountdown, getInterval());

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [date]);

  return <>{label}</>;
}

function ScoreBlock({
  score,
  isChanged,
}: {
  score: number;
  isChanged: boolean;
}) {
  return (
    <div
      className={`ml-4 min-w-[3.25rem] text-right text-[2.15rem] font-black leading-none tabular-nums tracking-tight text-[#1a1208] sm:text-[2.35rem] ${
        isChanged ? "no-noise-score-pop" : ""
      }`}
    >
      {score}
    </div>
  );
}

function TeamLine({
  game,
  side,
  favoriteTeamAbbr,
  changedScoreKeys,
}: {
  game: Game;
  side: "away" | "home";
  favoriteTeamAbbr: string | null;
  changedScoreKeys: Set<string>;
}) {
  const team = game[side];
  const showScore = game.status !== "upcoming";
  const edgeLabel = getTeamEdgeLabel(game, side);
  const winningSide = getWinningSide(game);
  const isWinner = winningSide === side;
  const isLoser = Boolean(winningSide && winningSide !== side);
  const isFavoriteTeam = favoriteTeamAbbr === team.abbreviation;
  const changedScoreKey = `${game.id}-${side}`;

  return (
    <div
      className={`-mx-1.5 flex items-center justify-between rounded-[0.9rem] px-1.5 py-2 transition sm:py-3 ${
        isWinner ? "bg-orange-50/70" : ""
      } ${isLoser ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <TeamLogo team={team} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.95rem] font-black tracking-tight text-[#1a1208] sm:text-lg">
              {team.abbreviation}
            </p>

            {isFavoriteTeam && (
              <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-wide text-orange-700">
                MY TEAM
              </span>
            )}

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

          <p className="truncate text-[0.74rem] font-semibold leading-tight text-[#a89880] sm:text-sm">
            {team.name}
          </p>
        </div>
      </div>

      {showScore ? (
        <ScoreBlock
          score={team.score}
          isChanged={changedScoreKeys.has(changedScoreKey)}
        />
      ) : (
        <div className="ml-3 min-w-[2.5rem] text-right text-[1.45rem] font-black leading-none tracking-tight text-[#d4cdc0] sm:min-w-[3.25rem] sm:text-[2.35rem]">
          –
        </div>
      )}
    </div>
  );
}

function GameUtilityRow({ game }: { game: Game }) {
  const watchLabel = game.broadcasts.length > 0 ? game.broadcasts.join(" / ") : "";
  const lineLabel = [game.line?.spread, game.line?.total]
    .filter(Boolean)
    .join(" · ");

  if (!watchLabel && !lineLabel) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {watchLabel && (
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-[#f8f5f0] px-2.5 py-1 text-[0.66rem] font-bold text-[#8a7a66] ring-1 ring-[#e8e0d4]">
          <span className="font-[family-name:var(--font-display)] text-[0.55rem] font-black uppercase tracking-[0.12em] text-[#c0b0a0]">
            Watch
          </span>
          <span className="truncate">{watchLabel}</span>
        </span>
      )}
      {lineLabel && (
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-[#fffaf2] px-2.5 py-1 text-[0.66rem] font-bold text-[#8a7a66] ring-1 ring-[#e8e0d4]">
          <span className="font-[family-name:var(--font-display)] text-[0.55rem] font-black uppercase tracking-[0.12em] text-[#c0b0a0]">
            Line
          </span>
          <span className="truncate">{lineLabel}</span>
        </span>
      )}
    </div>
  );
}

function PlayoffBand({ game }: { game: Game }) {
  const [shareOpen, setShareOpen] = useState(false);
  const finalSummary = getFinalSummary(game);
  const stake = getGameMomentStake(game);

  if (!game.gameContext && !game.seriesSummary && !finalSummary && !stake) return null;

  return (
    <>
      <div className="mt-2.5 rounded-[1rem] bg-[#1a1208] px-3 py-2.5 text-white ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {stake && (
              <div className="mb-1.5">
                <MomentStakePill stake={stake} surface="dark" />
              </div>
            )}

            {game.status === "final" && finalSummary && (
              <p className="font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-emerald-300">
                {finalSummary}
              </p>
            )}

            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {game.gameContext && (
                <p className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-orange-300">
                  {game.gameContext}
                </p>
              )}

              {game.seriesSummary && (
                <p className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-white">
                  {game.seriesSummary}
                </p>
              )}
            </div>
          </div>
          <ShareButton onClick={() => setShareOpen(true)} />
        </div>
      </div>
      {shareOpen && (
        <ShareModal
          payload={{ kind: "game", game }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

export function GameCard({
  game,
  favoriteTeamAbbr,
  changedScoreKeys,
  onOpen,
}: {
  game: Game;
  favoriteTeamAbbr: string | null;
  changedScoreKeys: Set<string>;
  onOpen?: (game: Game) => void;
}) {
  const isFavoriteGame = gameIncludesTeam(game, favoriteTeamAbbr);
  const isInteractive = Boolean(onOpen);
  const pulse = getPulseState(game);
  const showPulse = game.status === "live";
  const momentum = getMomentumSeries(game, 22);

  return (
    <article
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? () => onOpen?.(game) : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen?.(game);
              }
            }
          : undefined
      }
      className={`overflow-hidden rounded-[1.2rem] bg-[#ffffff] text-left text-[#1a1208] shadow-xl shadow-black/15 ring-1 ring-[#e8e0d4] transition sm:rounded-[1.65rem] ${
        isInteractive ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-300" : ""
      } ${getCardAccentClasses(
        game.status
      )}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#e8e0d4] bg-[#f8f5f0] px-3 py-2.5">
        <div className="min-w-0">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-wide ring-1 ${getStatusClasses(
              game.status
            )}`}
          >
            {game.status === "live" && (
              <span className="no-noise-live-fade h-1.5 w-1.5 rounded-full bg-orange-600" />
            )}
            {getStatusLabel(game.status)}
          </div>

          {game.status !== "final" && (
            <p className="mt-1 truncate text-[0.78rem] font-bold leading-tight text-[#a89880]">
              {game.status === "live"
                ? "Live now"
                : game.status === "upcoming" && isFavoriteGame
                  ? <CountdownText date={game.date} />
                  : getGameSubStatus(game)}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-[family-name:var(--font-display)] text-[1.08rem] font-black uppercase leading-none tracking-tight text-[#1a1208] sm:text-xl">
            {game.status === "live"
              ? game.statusText
              : formatGameDateTime(game.date)}
          </p>

          <p className="mt-1 font-[family-name:var(--font-display)] text-[9px] font-black uppercase tracking-[0.14em] text-[#a89880]">
            {showPulse ? pulse.label : game.matchup}
          </p>
        </div>
      </div>

      <div className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="divide-y divide-[#e8e0d4]">
          <TeamLine
            game={game}
            side="away"
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
          />
          <TeamLine
            game={game}
            side="home"
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
          />
        </div>

        {showPulse && (
          <div className="mt-2.5 rounded-[1rem] bg-[#fff7ef] px-3 py-2.5 ring-1 ring-orange-100">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[0.72rem] font-black text-[#1a1208]">
                {getPulseReason(game)}
              </p>
              <p className="shrink-0 font-[family-name:var(--font-display)] text-[0.54rem] font-black uppercase tracking-[0.14em] text-[#e85d04]">
                {pulse.label}
              </p>
            </div>
            <TensionBar pulse={pulse} compact />
            <div className="mt-2">
              <MomentumSparkline data={momentum} height={30} />
            </div>
          </div>
        )}

        <GameUtilityRow game={game} />

        <PlayoffBand game={game} />
      </div>
    </article>
  );
}

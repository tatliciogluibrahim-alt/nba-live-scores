"use client";

import { useEffect, useState } from "react";
import type { Game } from "../types";
import {
  gameIncludesTeam,
  getFinalSummary,
  getGameSubStatus,
  getWinningSide,
} from "../lib/games";
import { formatCountdown } from "../lib/time";
import { getGameMomentStake } from "../lib/moment-intelligence";
import { MomentStakePill } from "./moment-stake-pill";
import { getPulseReason } from "./pulse-primitives";
import { ShareButton, ShareModal } from "./share-card";
import { TeamLogo } from "./team-logo";
import {
  AppCard,
  StatusPill,
  TeamRow,
  Watch,
  type StatusTone,
} from "../../shared/atoms";

function statusToTone(status: Game["status"]): StatusTone {
  if (status === "live") return "live";
  if (status === "upcoming") return "upcoming";
  return "final";
}

function statusToAccent(status: Game["status"]): string | undefined {
  if (status === "live") return "var(--nba)";
  if (status === "upcoming") return "var(--up)";
  return undefined;
}

function statusLabel(game: Game): string {
  if (game.status === "live") return `Live · ${game.statusText}`;
  if (game.status === "upcoming") return game.statusText;
  return "Final";
}

function CountdownText({ date }: { date: string }) {
  const [label, setLabel] = useState("Starting soon");

  useEffect(() => {
    const updateCountdown = () => setLabel(formatCountdown(date));
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

// Series-context / share strip beneath the score rows. Kept because
// share is a key growth loop. Status chip now uses the shared StatusPill
// when there's a stake; otherwise just shows context + share button.
function PlayoffBand({ game }: { game: Game }) {
  const [shareOpen, setShareOpen] = useState(false);
  const finalSummary = getFinalSummary(game);
  const stake = getGameMomentStake(game);

  if (!game.gameContext && !game.seriesSummary && !finalSummary && !stake) return null;

  return (
    <>
      <div
        className="mt-2.5 flex items-start justify-between gap-2 rounded-[10px] px-3 py-2"
        style={{ background: "var(--cream-2)" }}
      >
        <div className="min-w-0 flex-1">
          {stake && (
            <div className="mb-1.5">
              <MomentStakePill stake={stake} />
            </div>
          )}
          {game.status === "final" && finalSummary && (
            <p className="text-[12px] font-semibold" style={{ color: "var(--ink)" }}>
              {finalSummary}
            </p>
          )}
          <div className="flex flex-wrap gap-x-2.5 gap-y-1">
            {game.gameContext && (
              <p className="text-[12px] font-semibold" style={{ color: "var(--mute-1)" }}>
                {game.gameContext}
              </p>
            )}
            {game.seriesSummary && (
              <p className="text-[12px] font-semibold" style={{ color: "var(--ink)" }}>
                {game.seriesSummary}
              </p>
            )}
          </div>
        </div>
        <ShareButton onClick={() => setShareOpen(true)} />
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
  const winningSide = getWinningSide(game);
  const showScore = game.status !== "upcoming";
  const watchLabel = game.broadcasts[0];

  const caption =
    game.status === "live"
      ? getPulseReason(game)
      : game.status === "upcoming" && isFavoriteGame
        ? null // CountdownText renders inline below
        : game.status === "upcoming"
          ? getGameSubStatus(game)
          : null;

  const myTeamBadge = (side: "away" | "home") =>
    favoriteTeamAbbr === game[side].abbreviation ? (
      <StatusPill tone="current" dot={false}>
        My team
      </StatusPill>
    ) : undefined;

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
      className={
        isInteractive
          ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--up)]"
          : ""
      }
    >
      <AppCard accent={statusToAccent(game.status)} padded={false}>
        <div className="px-3.5 py-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <StatusPill tone={statusToTone(game.status)} breathe={game.status === "live"}>
                {statusLabel(game)}
              </StatusPill>
              {game.matchup && (
                <span
                  className="truncate text-[11px] font-semibold"
                  style={{ color: "var(--mute-1)" }}
                >
                  {game.matchup}
                </span>
              )}
            </div>
            {watchLabel && <Watch channel={watchLabel} compact />}
          </div>

          <TeamRow
            logo={<TeamLogo team={game.away} />}
            code={game.away.abbreviation}
            name={game.away.name}
            score={showScore ? game.away.score : undefined}
            leading={winningSide === "away"}
            won={game.status === "final" && winningSide === "away"}
            badge={myTeamBadge("away")}
            scoreAnimated={changedScoreKeys.has(`${game.id}-away`)}
          />
          <TeamRow
            logo={<TeamLogo team={game.home} />}
            code={game.home.abbreviation}
            name={game.home.name}
            score={showScore ? game.home.score : undefined}
            leading={winningSide === "home"}
            won={game.status === "final" && winningSide === "home"}
            badge={myTeamBadge("home")}
            scoreAnimated={changedScoreKeys.has(`${game.id}-home`)}
          />

          {caption && (
            <div
              className="mt-2 text-[12px] font-medium"
              style={{ color: "var(--mute-1)" }}
            >
              {caption}
            </div>
          )}

          {game.status === "upcoming" && isFavoriteGame && (
            <div
              className="mt-2 text-[12px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              <CountdownText date={game.date} />
            </div>
          )}

          <PlayoffBand game={game} />
        </div>
      </AppCard>
    </article>
  );
}

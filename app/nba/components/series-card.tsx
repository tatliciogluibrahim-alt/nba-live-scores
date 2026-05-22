"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { SeriesInfo, Team } from "../types";
import {
  formatGameDateTime,
  formatGameTime,
  getScoreboardToday,
  isSameScoreboardDay,
  isTomorrow,
} from "../lib/time";
import {
  getSeriesGameLabel,
  getSeriesLabel,
  getSeriesRecord,
  getSeriesStatusLabel,
} from "../lib/series";
import { getSeriesMomentStake } from "../lib/moment-intelligence";
import { ShareButton, ShareModal } from "./share-card";
import {
  AppCard,
  StatusPill,
  type StatusTone,
} from "../../shared/atoms";

function statusLabelToTone(label: string): StatusTone {
  if (label === "Live") return "live";
  if (label === "Final") return "final";
  return "upcoming";
}

function WinDots({ wins, color }: { wins: number; color: string }) {
  return (
    <div className="flex shrink-0" style={{ gap: 3 }}>
      {Array.from({ length: 7 }).map((_, index) => (
        <span
          key={index}
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: index < wins ? color : "var(--mute-2)",
            opacity: index < wins ? 1 : 0.45,
          }}
        />
      ))}
    </div>
  );
}

function TeamLogoBubble({ team }: { team: Team }) {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--paper)", boxShadow: "0 0 0 1px var(--line)" }}
    >
      {team.logo ? (
        <img src={team.logo} alt="" className="h-5 w-5 object-contain" />
      ) : (
        <span className="text-[9px] font-bold" style={{ color: "var(--ink)" }}>
          {team.abbreviation}
        </span>
      )}
    </div>
  );
}

export function SeriesCard({
  series,
  favoriteTeamAbbr,
}: {
  series: SeriesInfo;
  favoriteTeamAbbr: string | null;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const isComplete = series.teamA.wins === 4 || series.teamB.wins === 4;
  const winner = isComplete
    ? series.teamA.wins === 4
      ? series.teamA
      : series.teamB
    : null;

  const teams = [series.teamA, series.teamB] as (Team & { wins: number })[];
  const seriesGameLabel = getSeriesGameLabel(series);
  const seriesLabel = seriesGameLabel
    ? `${getSeriesLabel(series)} · ${seriesGameLabel}`
    : getSeriesLabel(series);
  const seriesRecord = getSeriesRecord(series);
  const statusLabel = getSeriesStatusLabel(series);
  const stake = getSeriesMomentStake(series);

  const tone = statusLabelToTone(statusLabel);
  const accent =
    series.status === "live"
      ? "var(--nba)"
      : series.status === "upcoming"
        ? "var(--up)"
        : undefined;

  const gameDate = series.nextGame ? new Date(series.nextGame.date) : null;
  const isTonight = gameDate
    ? isSameScoreboardDay(gameDate, getScoreboardToday())
    : false;
  const isTomorrowGame = gameDate ? isTomorrow(gameDate) : false;
  const game7Label = series.isGame7
    ? series.status === "live"
      ? "Game 7"
      : isTonight
        ? "Game 7 tonight"
        : isTomorrowGame
          ? "Game 7 tomorrow"
          : null
    : null;
  const nextGameTime =
    series.nextGame && series.status !== "live"
      ? formatGameTime(series.nextGame.date)
      : null;

  return (
    <>
      <AppCard accent={accent} padded={false}>
        <div className="px-3 py-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--mute-1)" }}
              >
                {seriesLabel}
              </p>
              <p
                className="mt-0.5 text-[12px] font-medium"
                style={{ color: "var(--mute-1)" }}
              >
                {seriesRecord}
              </p>
            </div>
            <StatusPill tone={tone} breathe={series.status === "live"}>
              {statusLabel}
            </StatusPill>
          </div>

          {(stake || game7Label) && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              {game7Label && (
                <StatusPill tone="live" breathe={series.status === "live"} dot>
                  {game7Label}
                </StatusPill>
              )}
              {stake && !game7Label && (
                <StatusPill
                  tone={
                    stake.tone === "live"
                      ? "live"
                      : stake.tone === "urgent"
                        ? "live"
                        : stake.tone === "complete"
                          ? "final"
                          : "current"
                  }
                  dot={stake.tone === "live" || stake.tone === "urgent"}
                  breathe={stake.tone === "live"}
                >
                  {stake.label}
                </StatusPill>
              )}
              {nextGameTime && series.status !== "live" && (
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--mute-1)" }}
                >
                  {nextGameTime}
                </span>
              )}
            </div>
          )}

          {teams.map((team, index) => {
            const isWinner = winner?.abbreviation === team.abbreviation;
            const isLoser = isComplete && !isWinner;
            const isMyTeam = team.abbreviation === favoriteTeamAbbr;
            const dotColor = isLoser
              ? "var(--mute-2)"
              : series.status === "live"
                ? "var(--nba)"
                : "var(--ink)";
            return (
              <div
                key={team.abbreviation}
                className="flex items-center gap-2.5 py-1.5"
                style={{
                  opacity: isLoser ? 0.45 : 1,
                  borderTop: index === 1 ? "1px solid var(--line)" : "none",
                  marginTop: index === 1 ? 2 : 0,
                  paddingTop: index === 1 ? 8 : undefined,
                }}
              >
                <TeamLogoBubble team={team} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[14px] font-bold"
                      style={{ color: "var(--ink)" }}
                    >
                      {team.abbreviation}
                    </span>
                    {isMyTeam && (
                      <StatusPill tone="current" dot={false}>
                        My team
                      </StatusPill>
                    )}
                    {isComplete && isWinner && (
                      <StatusPill tone="current" dot={false}>
                        Won
                      </StatusPill>
                    )}
                  </div>
                  <div
                    className="truncate text-[11px]"
                    style={{ color: "var(--mute-1)" }}
                  >
                    {team.name}
                  </div>
                </div>
                <WinDots wins={team.wins} color={dotColor} />
                <div
                  className="w-5 text-right tabular-nums"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: isLoser ? "var(--mute-2)" : "var(--ink)",
                    opacity: isLoser ? 0.6 : 1,
                  }}
                >
                  {team.wins}
                </div>
              </div>
            );
          })}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            {series.nextGame && series.status !== "live" && !game7Label ? (
              <span
                className="min-w-0 flex-1 truncate text-[12px] font-medium"
                style={{ color: "var(--mute-1)" }}
              >
                Next · {formatGameDateTime(series.nextGame.date)}
              </span>
            ) : (
              <span />
            )}
            <ShareButton onClick={() => setShareOpen(true)} />
          </div>
        </div>
      </AppCard>

      {shareOpen && (
        <ShareModal
          payload={{ kind: "series", series }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

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
import { MomentStakePill } from "./moment-stake-pill";
import { ShareModal } from "./share-card";

function getSeriesStatusPillClasses(series: SeriesInfo) {
  const statusLabel = getSeriesStatusLabel(series);

  if (statusLabel === "Live") {
    return "bg-orange-100 text-orange-800 ring-orange-200";
  }

  if (statusLabel === "Final") {
    return "bg-slate-200 text-slate-700 ring-slate-300";
  }

  return "bg-blue-100 text-blue-800 ring-blue-200";
}

function WinDots({ wins, dotColor }: { wins: number; dotColor: string }) {
  return (
    <div className="flex shrink-0" style={{ gap: 3 }}>
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: index < wins ? dotColor : "#d4cdc0",
            flexShrink: 0,
          }}
        />
      ))}
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
  const isSeriesOver = series.teamA.wins === 4 || series.teamB.wins === 4;
  const winner = isSeriesOver
    ? series.teamA.wins === 4
      ? series.teamA
      : series.teamB
    : null;

  const gameDate = series.nextGame ? new Date(series.nextGame.date) : null;
  const isTonight = gameDate
    ? isSameScoreboardDay(gameDate, getScoreboardToday())
    : false;
  const isTomorrowGame = gameDate ? isTomorrow(gameDate) : false;
  const isTier1 = series.status === "live" || (series.isGame7 && isTonight);
  const isTier3 = isSeriesOver;
  const accentColor = isTier1 ? "#e85d04" : isTier3 ? "#2d7a3a" : "#d4cdc0";

  const game7Label = series.isGame7
    ? series.status === "live"
      ? "Game 7"
      : isTonight
        ? "Game 7 Tonight"
        : isTomorrowGame
          ? "Game 7 Tomorrow"
          : null
    : null;

  const nextGameTime =
    series.nextGame && series.status !== "live"
      ? formatGameTime(series.nextGame.date)
      : null;

  const teams = [series.teamA, series.teamB] as (Team & { wins: number })[];
  const seriesGameLabel = getSeriesGameLabel(series);
  const seriesLabel = seriesGameLabel
    ? `${getSeriesLabel(series)} · ${seriesGameLabel}`
    : getSeriesLabel(series);
  const seriesRecord = getSeriesRecord(series);
  const statusLabel = getSeriesStatusLabel(series);
  const stake = getSeriesMomentStake(series);

  return (
    <>
      <div
        className="min-w-0 overflow-hidden rounded-[1.35rem]"
        style={{
          border: isTier1
            ? "2px solid #e85d04"
            : "1px solid #e8e0d4",
          background: isTier3 ? "#f9f7f3" : "#ffffff",
        }}
      >
        <div className="flex">
          <div style={{ width: 3, flexShrink: 0, background: accentColor }} />

          <div className="min-w-0 flex-1 px-3 py-3">
            <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase leading-tight text-[#a89880]">
                  {seriesLabel}
                </p>
                <p className="mt-0.5 text-[0.72rem] font-semibold leading-tight text-[#8a7a66]">
                  {seriesRecord}
                </p>
                {stake && (
                  <div className="mt-2">
                    <MomentStakePill stake={stake} />
                  </div>
                )}
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-[family-name:var(--font-display)] text-[8px] font-black uppercase ring-1 ${getSeriesStatusPillClasses(
                  series
                )}`}
              >
                {statusLabel === "Live" && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-600" />
                )}
                {statusLabel}
              </span>
            </div>

            {isTier1 && game7Label && (
              <div className="mb-3 flex items-center gap-2.5">
                <span
                  style={{
                    background: "#e85d04",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 6,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-display)",
                    lineHeight: 1,
                  }}
                >
                  {game7Label}
                </span>
                {nextGameTime && (
                  <span className="text-[0.72rem] font-semibold text-[#a89880]">
                    {nextGameTime}
                  </span>
                )}
                {series.status === "live" && (
                  <span className="flex items-center gap-1 text-[0.72rem] font-bold text-[#e85d04]">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ background: "#e85d04" }}
                    />
                    {series.nextGame?.statusText ?? "Live"}
                  </span>
                )}
              </div>
            )}

            {teams.map((team, index) => {
              const isWinner = winner?.abbreviation === team.abbreviation;
              const isLoser = isSeriesOver && !isWinner;
              const isMyTeamRow = team.abbreviation === favoriteTeamAbbr;
              const dotColor = isLoser ? "#d4cdc0" : accentColor;

              return (
                <div
                  key={team.abbreviation}
                  className={`flex min-w-0 items-center justify-between gap-2 ${
                    index === 1 ? "mt-2 border-t border-[#f0ece4] pt-2" : ""
                  }`}
                  style={{ opacity: isLoser ? 0.35 : 1 }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className="flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: 30,
                        height: 30,
                        background: "#f8f5f0",
                        boxShadow: "0 0 0 1px #e8e0d4",
                      }}
                    >
                      {team.logo ? (
                        <img src={team.logo} alt="" className="h-5 w-5 object-contain" />
                      ) : (
                        <span className="text-[8px] font-black text-[#1a1208]">
                          {team.abbreviation}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="text-[0.88rem] font-black leading-none tracking-tight text-[#1a1208]">
                          {team.abbreviation}
                        </span>
                        {isMyTeamRow && (
                          <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide text-[#e85d04]">
                            MY TEAM
                          </span>
                        )}
                        {isSeriesOver && isWinner && (
                          <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide text-white"
                            style={{ background: "#2d7a3a" }}
                          >
                            WIN
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[0.67rem] font-medium text-[#a89880]">
                        {team.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 pl-1">
                    <WinDots wins={team.wins} dotColor={dotColor} />
                    <span
                      className="tabular-nums leading-none"
                      style={{
                        width: 16,
                        textAlign: "right",
                        fontSize: "1.15rem",
                        fontWeight: 900,
                        color: isLoser ? "#c0b0a0" : "#1a1208",
                      }}
                    >
                      {team.wins}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {series.status === "live" && !isTier1 && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide"
                    style={{ background: "#fff0e8", color: "#e85d04" }}
                  >
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ background: "#e85d04" }}
                    />
                    {series.nextGame?.statusText ?? "Live"}
                  </span>
                )}
                {game7Label && !isTier1 && (
                  <span
                    className="rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide"
                    style={{ background: "#fff0e8", color: "#e85d04" }}
                  >
                    {game7Label}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                {series.nextGame && series.status !== "live" && !isTier1 && (
                  <span className="min-w-0 flex-1 truncate text-right text-[0.68rem] font-semibold text-[#a89880]">
                    Next: {formatGameDateTime(series.nextGame.date)}
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Share series"
                  onClick={() => setShareOpen(true)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8e0d4] text-[#8a7a66] transition hover:bg-[#d4cdc0] active:scale-95"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {shareOpen && (
        <ShareModal
          payload={{ kind: "series", series }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}

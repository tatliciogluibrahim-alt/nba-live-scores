"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game, SeriesInfo } from "../types";
import {
  buildBracketSeries,
  getSeriesUrgencyRank,
} from "../lib/series";
import {
  mergeSeriesWithMemory,
  persistedFromSeries,
  readSeriesMemory,
  type PersistedSeries,
  writeSeriesMemory,
} from "../lib/series-memory";
import { SeriesCard } from "./series-card";

type SeriesBoardTab = "east" | "west" | "finals";

function BracketEmptyState({
  onBackToScores,
}: {
  onBackToScores: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/10 ring-1 ring-[#e8e0d4] sm:p-10">
      <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#e85d04]">
        NBA Playoffs
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-black uppercase text-[#1a1208] sm:text-5xl">
        Series Board
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8a7a66]">
        Series cards appear here as playoff games come in. Completed series stay pinned so you can follow the road to the Finals.
      </p>
      <button
        type="button"
        onClick={onBackToScores}
        className="mt-6 rounded-full bg-[#1a1208] px-5 py-2.5 font-[family-name:var(--font-display)] text-xs font-black uppercase text-[#f5f1ea] transition hover:bg-[#2a1e10] active:scale-95"
      >
        Back to Scores
      </button>
    </section>
  );
}

function LockedSeriesCard({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[#e8e0d4] bg-[#fbf8f3]">
      <div className="flex">
        <div className="w-[3px] shrink-0 bg-[#e8e0d4]" />
        <div className="flex-1 px-3 py-3.5">
          <div className="mb-2.5 flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.1em] text-[#a89880]">
                {label}
              </p>
              <p className="mt-1 text-[0.7rem] font-medium leading-snug text-[#8a7a66]">
                {body}
              </p>
            </div>
            <span className="rounded-full bg-white/70 px-2 py-0.5 font-[family-name:var(--font-display)] text-[8px] font-black uppercase tracking-wide text-[#a89880] ring-1 ring-[#e0d8d0]">
              Next
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 ring-1 ring-[#ede8e0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d4cdc0]" />
            <span className="text-[0.66rem] font-semibold uppercase tracking-wide text-[#a89880]">
              Awaiting winners
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketRoundColumn({
  title,
  series,
  favoriteTeamAbbr,
  lockedBody,
}: {
  title: string;
  series: SeriesInfo[];
  favoriteTeamAbbr: string | null;
  lockedBody?: string;
}) {
  if (!series.length && !lockedBody) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase text-[#a89880]">
          {title}
        </p>
        <span className="text-[0.62rem] font-bold uppercase text-[#c0b0a0]">
          {series.length ? `${series.length} series` : "Locked"}
        </span>
      </div>

      {series.length > 0 ? (
        series.map((item) => (
          <SeriesCard
            key={item.key}
            series={item}
            favoriteTeamAbbr={favoriteTeamAbbr}
          />
        ))
      ) : (
        <LockedSeriesCard label={title} body={lockedBody ?? "Matchup coming soon"} />
      )}
    </div>
  );
}

function getConferenceRoundColumns(series: SeriesInfo[]) {
  const byRound = (round: string) =>
    series
      .filter((item) => item.round === round)
      .sort((a, b) => getSeriesUrgencyRank(a) - getSeriesUrgencyRank(b));

  const firstRound = byRound("First Round");
  const semifinals = byRound("Second Round");
  const confFinals = byRound("Conf Finals");
  const hasAnySeries = firstRound.length > 0 || semifinals.length > 0 || confFinals.length > 0;

  const columns: {
    key: string;
    title: string;
    series: SeriesInfo[];
    lockedBody?: string;
  }[] = [];

  if (firstRound.length > 0) {
    columns.push({
      key: "first",
      title: "First Round",
      series: firstRound,
    });
  }

  if (semifinals.length > 0) {
    columns.push({
      key: "semis",
      title: "Semifinals",
      series: semifinals,
    });
  } else if (firstRound.length > 0) {
    columns.push({
      key: "semis-locked",
      title: "Semifinals",
      series: [],
      lockedBody: "First-round winners slot in here.",
    });
  }

  if (confFinals.length > 0) {
    columns.push({
      key: "finals",
      title: "Conference Finals",
      series: confFinals,
    });
  } else if (hasAnySeries) {
    columns.push({
      key: "finals-locked",
      title: "Conference Finals",
      series: [],
      lockedBody: "Semifinal winners slot in here.",
    });
  }

  return columns;
}

function BracketConferenceSection({
  conference,
  series,
  favoriteTeamAbbr,
}: {
  conference: "East" | "West";
  series: SeriesInfo[];
  favoriteTeamAbbr: string | null;
}) {
  const columns = getConferenceRoundColumns(series);
  if (!columns.length) return null;

  const lgClass =
    columns.length >= 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.6rem] bg-[#fbf8f3] ring-1 ring-[#e8e0d4]">
      <div className="flex items-end justify-between gap-4 border-b border-[#ede8df] px-4 py-3 sm:px-5">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
            {conference}ern Conference
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-black uppercase text-[#1a1208] sm:text-3xl">
            {conference} Board
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-wide text-[#8a7a66] ring-1 ring-[#e8e0d4]">
          {series.length} active
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-4 p-4 sm:p-5 ${lgClass}`}>
        {columns.map((column) => (
          <BracketRoundColumn
            key={column.key}
            title={column.title}
            series={column.series}
            favoriteTeamAbbr={favoriteTeamAbbr}
            lockedBody={column.lockedBody}
          />
        ))}
      </div>
    </section>
  );
}

function MiniBracketMap({ series }: { series: SeriesInfo[] }) {
  const liveSeries = series.find((item) => item.status === "live");
  const eastChamp =
    series.find((item) => item.conference === "East" && item.round === "Conf Finals")
      ?.teamA.abbreviation ?? "EAST";
  const westChamp =
    series.find((item) => item.conference === "West" && item.round === "Conf Finals")
      ?.teamA.abbreviation ?? "WEST";
  const activeLabel = liveSeries
    ? `${liveSeries.teamA.abbreviation}/${liveSeries.teamB.abbreviation}`
    : "Map";

  return (
    <section className="overflow-hidden rounded-[1.35rem] bg-[#fbf8f3] ring-1 ring-[#e8e0d4]">
      <div className="flex items-center justify-between gap-3 border-b border-[#ede8df] px-4 py-3">
        <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#a89880]">
          Playoff Map
        </p>
        <span className="rounded-full bg-white px-2.5 py-1 font-[family-name:var(--font-display)] text-[0.56rem] font-black uppercase tracking-[0.12em] text-[#e85d04] ring-1 ring-[#f0d7c7]">
          {activeLabel}
        </span>
      </div>
      <svg viewBox="0 0 340 132" className="h-[132px] w-full">
        {[
          ["M34 18H76V34H95", liveSeries],
          ["M34 50H76V34H95", liveSeries],
          ["M34 82H76V98H95", null],
          ["M34 114H76V98H95", null],
          ["M116 34H154V66H169", liveSeries],
          ["M116 98H154V66H169", null],
          ["M306 18H264V34H245", null],
          ["M306 50H264V34H245", null],
          ["M306 82H264V98H245", null],
          ["M306 114H264V98H245", null],
          ["M224 34H188V66H171", null],
          ["M224 98H188V66H171", null],
        ].map(([path, active], index) => (
          <path
            key={`${path}-${index}`}
            d={path as string}
            fill="none"
            stroke={active ? "#e85d04" : "rgba(26,18,8,0.16)"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 3 : 1.5}
          />
        ))}

        {[
          [22, 18, "NY"],
          [22, 50, "CLE"],
          [22, 82, "BOS"],
          [22, 114, "ORL"],
          [106, 34, "NY"],
          [106, 98, "BOS"],
          [170, 66, eastChamp],
          [318, 18, "OKC"],
          [318, 50, "DEN"],
          [318, 82, "MIN"],
          [318, 114, "LAL"],
          [234, 34, "OKC"],
          [234, 98, "MIN"],
          [170, 104, westChamp],
        ].map(([x, y, label]) => {
          const active = label === "NY" || label === eastChamp;

          return (
            <g key={`${x}-${y}-${label}`}>
              <rect
                x={Number(x) - 16}
                y={Number(y) - 11}
                width="32"
                height="22"
                rx="7"
                fill={active ? "#fff0e8" : "#ffffff"}
                stroke={active ? "#e85d04" : "#e8e0d4"}
              />
              <text
                x={Number(x)}
                y={Number(y) + 4}
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontSize="8"
                fontWeight="900"
                fill="#1a1208"
              >
                {String(label).slice(0, 4)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function SeriesBoard({
  games,
  favoriteTeamAbbr,
  onBackToScores,
}: {
  games: Game[];
  favoriteTeamAbbr: string | null;
  onBackToScores: () => void;
}) {
  const [remembered, setRemembered] = useState<PersistedSeries[]>([]);
  const [activeBoard, setActiveBoard] = useState<SeriesBoardTab>("east");

  useEffect(() => {
    const hydrationTimeout = setTimeout(() => {
      setRemembered(readSeriesMemory());
    }, 0);

    return () => clearTimeout(hydrationTimeout);
  }, []);

  const liveSeries = useMemo(() => buildBracketSeries(games), [games]);

  useEffect(() => {
    const completedNow = liveSeries.filter(
      (series) =>
        series.status === "complete" &&
        (series.teamA.wins === 4 || series.teamB.wins === 4) &&
        series.teamA.abbreviation !== "TBD" &&
        series.teamB.abbreviation !== "TBD"
    );
    if (completedNow.length === 0) return;

    const existing = readSeriesMemory();
    const byKey = new Map(existing.map((series) => [series.key, series]));
    let changed = false;

    completedNow.map(persistedFromSeries).forEach((item) => {
      const previous = byKey.get(item.key);
      if (JSON.stringify(previous) !== JSON.stringify(item)) changed = true;
      byKey.set(item.key, item);
    });

    if (!changed) return;

    const next = Array.from(byKey.values());
    writeSeriesMemory(next);
    const memoryUpdateTimeout = setTimeout(() => {
      setRemembered(next);
    }, 0);

    return () => clearTimeout(memoryUpdateTimeout);
  }, [liveSeries]);

  const allSeries = useMemo(
    () => mergeSeriesWithMemory(liveSeries, remembered),
    [liveSeries, remembered]
  );

  if (allSeries.length === 0) {
    return <BracketEmptyState onBackToScores={onBackToScores} />;
  }

  const eastSeries = allSeries.filter((series) => series.conference === "East");
  const westSeries = allSeries.filter((series) => series.conference === "West");
  const finals = allSeries.filter(
    (series) => series.round === "NBA Finals" || series.conference === "Finals"
  );
  const unknownSeries = allSeries.filter(
    (series) =>
      series.conference !== "East" &&
      series.conference !== "West" &&
      series.conference !== "Finals" &&
      series.round !== "NBA Finals"
  );
  const hasConferenceSeries = eastSeries.length > 0 || westSeries.length > 0;
  const liveCount = allSeries.filter((series) => series.status === "live").length;
  const upcomingCount = allSeries.filter((series) => series.status === "upcoming").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase text-[#e85d04]">
            NBA Playoffs
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-5xl font-black uppercase leading-none text-[#1a1208] sm:text-6xl">
            Series Board.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#1a1208] px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase text-[#f5f1ea]">
            {allSeries.length} series
          </span>
          <span className="rounded-full bg-orange-100 px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase text-orange-800 ring-1 ring-orange-200">
            {liveCount} live
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase text-blue-800 ring-1 ring-blue-200">
            {upcomingCount} upcoming
          </span>
        </div>
      </header>

      <MiniBracketMap series={allSeries} />

      <div className="grid grid-cols-3 rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1">
        {(["east", "west", "finals"] as SeriesBoardTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveBoard(tab)}
            className={`rounded-[0.85rem] px-3 py-2 font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.12em] transition active:scale-[0.98] ${
              activeBoard === tab
                ? "bg-[#1a1208] text-[#f5f1ea]"
                : "text-[#8a7a66]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeBoard === "east" && (
        <BracketConferenceSection
          conference="East"
          series={eastSeries}
          favoriteTeamAbbr={favoriteTeamAbbr}
        />
      )}

      {activeBoard === "west" && (
        <BracketConferenceSection
          conference="West"
          series={westSeries}
          favoriteTeamAbbr={favoriteTeamAbbr}
        />
      )}

      {unknownSeries.length > 0 && (
        <section className="overflow-hidden rounded-[1.6rem] bg-[#fbf8f3] ring-1 ring-[#e8e0d4]">
          <div className="border-b border-[#ede8df] px-4 py-3 sm:px-5">
            <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
              Additional Series
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-black uppercase text-[#1a1208] sm:text-3xl">
              Series View
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {unknownSeries.map((series) => (
              <SeriesCard
                key={series.key}
                series={series}
                favoriteTeamAbbr={favoriteTeamAbbr}
              />
            ))}
          </div>
        </section>
      )}

      {activeBoard === "finals" && (finals.length > 0 || hasConferenceSeries) && (
        <section className="overflow-hidden rounded-[1.6rem] bg-[#fbf8f3] ring-1 ring-[#e8e0d4]">
          <div className="border-b border-[#ede8df] px-4 py-3 text-center sm:px-5">
            <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#e85d04]">
              The Finals
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-black uppercase text-[#1a1208] sm:text-3xl">
              NBA Finals
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="mx-auto grid max-w-md grid-cols-1 gap-4">
              {finals.length > 0 ? (
                finals.map((series) => (
                  <SeriesCard
                    key={series.key}
                    series={series}
                    favoriteTeamAbbr={favoriteTeamAbbr}
                  />
                ))
              ) : (
                <LockedSeriesCard
                  label="NBA Finals"
                  body="Conference champions slot in here."
                />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

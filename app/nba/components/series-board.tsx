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
import {
  AppCard,
  Button,
  Eyebrow,
  Segmented,
  StatusPill,
} from "../../shared/atoms";

type SeriesBoardTab = "east" | "west" | "finals";

function BracketEmptyState({
  onBackToScores,
}: {
  onBackToScores: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <AppCard>
        <div className="px-6 py-8 text-center">
          <Eyebrow color="var(--nba)">NBA Playoffs</Eyebrow>
          <p
            className="mt-2 font-[family-name:var(--font-display)] text-4xl uppercase tracking-tight sm:text-5xl"
            style={{ color: "var(--ink)" }}
          >
            Series Board
          </p>
          <p
            className="mx-auto mt-3 max-w-md text-[13px] leading-6"
            style={{ color: "var(--mute-1)" }}
          >
            Series cards appear here as playoff games come in. Completed
            series stay pinned so you can follow the road to the Finals.
          </p>
          <div className="mt-5 flex justify-center">
            <Button variant="primary" onClick={onBackToScores}>
              Back to scores
            </Button>
          </div>
        </div>
      </AppCard>
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
    <AppCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{label}</Eyebrow>
          <p
            className="mt-1 text-[12px] leading-snug"
            style={{ color: "var(--mute-1)" }}
          >
            {body}
          </p>
        </div>
        <StatusPill tone="final" dot={false}>
          Awaiting winners
        </StatusPill>
      </div>
    </AppCard>
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
        <Eyebrow>{title}</Eyebrow>
        <span
          className="text-[11px] font-semibold"
          style={{ color: "var(--mute-2)" }}
        >
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
  const hasAnySeries =
    firstRound.length > 0 || semifinals.length > 0 || confFinals.length > 0;

  const columns: {
    key: string;
    title: string;
    series: SeriesInfo[];
    lockedBody?: string;
  }[] = [];

  if (firstRound.length > 0) {
    columns.push({ key: "first", title: "First Round", series: firstRound });
  }

  if (semifinals.length > 0) {
    columns.push({ key: "semis", title: "Semifinals", series: semifinals });
  } else if (firstRound.length > 0) {
    columns.push({
      key: "semis-locked",
      title: "Semifinals",
      series: [],
      lockedBody: "First-round winners slot in here.",
    });
  }

  if (confFinals.length > 0) {
    columns.push({ key: "finals", title: "Conference Finals", series: confFinals });
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
  const lgClass = columns.length >= 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

  return (
    <section
      className="overflow-hidden rounded-[16px]"
      style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
    >
      <div
        className="flex items-end justify-between gap-4 px-4 py-3 sm:px-5"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div>
          <Eyebrow>{conference}ern Conference</Eyebrow>
          <p
            className="mt-0.5 text-[20px] font-bold"
            style={{ color: "var(--ink)" }}
          >
            {conference} board
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: "var(--cream-2)",
            color: "var(--mute-1)",
          }}
        >
          {series.length} active
        </span>
      </div>
      <div className={`grid grid-cols-1 gap-3 p-4 sm:p-5 ${lgClass}`}>
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

// Compact, useful playoff map. Replaces the previous tall container with a
// tiny bracket. Live series highlighted in NBA orange; future slots dashed.
function MiniBracketMap({ series }: { series: SeriesInfo[] }) {
  const liveSeries = series.find((item) => item.status === "live");
  const activeLabel = liveSeries
    ? `${liveSeries.teamA.abbreviation} vs ${liveSeries.teamB.abbreviation}`
    : "Map";
  const rounds = ["First Round", "Second Round", "Conf Finals"] as const;

  const winnerOf = (item: SeriesInfo) => {
    if (item.teamA.wins === 4) return item.teamA.abbreviation;
    if (item.teamB.wins === 4) return item.teamB.abbreviation;
    if (item.teamA.wins > item.teamB.wins) return item.teamA.abbreviation;
    if (item.teamB.wins > item.teamA.wins) return item.teamB.abbreviation;
    return item.teamA.abbreviation;
  };
  const labelOf = (item: SeriesInfo) => {
    if (item.status === "complete") return winnerOf(item);
    if (item.status === "live")
      return `${item.teamA.abbreviation}/${item.teamB.abbreviation}`;
    return `${item.teamA.abbreviation}-${item.teamB.abbreviation}`;
  };
  const hasSharedTeam = (source: SeriesInfo, target: SeriesInfo) => {
    const sourceTeams = [source.teamA.abbreviation, source.teamB.abbreviation];
    return (
      sourceTeams.includes(target.teamA.abbreviation) ||
      sourceTeams.includes(target.teamB.abbreviation)
    );
  };
  const nodeRows = (conference: "East" | "West") => {
    const byRound = rounds.map((round) =>
      series
        .filter(
          (item) => item.conference === conference && item.round === round
        )
        .sort((a, b) => a.key.localeCompare(b.key))
    );

    return byRound.flatMap((items, roundIndex) => {
      const x = conference === "East" ? 28 + roundIndex * 62 : 312 - roundIndex * 62;
      const count = Math.max(items.length, 1);
      return items.map((item, index) => ({
        item,
        roundIndex,
        x,
        y: 22 + ((index + 0.5) * 84) / count,
      }));
    });
  };
  const nodes = [...nodeRows("East"), ...nodeRows("West")];
  const connectors = nodes.flatMap((node) => {
    const nextRound = nodes.filter(
      (candidate) =>
        candidate.item.conference === node.item.conference &&
        candidate.roundIndex === node.roundIndex + 1
    );
    if (nextRound.length === 0) return [];
    const matched =
      nextRound.find((candidate) => hasSharedTeam(node.item, candidate.item)) ??
      nextRound[Math.min(Math.floor(nodes.indexOf(node) / 2), nextRound.length - 1)];
    return matched ? [{ from: node, to: matched }] : [];
  });

  return (
    <AppCard padded={false}>
      <div
        className="flex items-center justify-between gap-3 px-3.5 py-2.5"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <span className="text-[12px] font-bold" style={{ color: "var(--ink)" }}>
          Playoff map
        </span>
        {liveSeries ? (
          <StatusPill tone="live" breathe>
            Live · {activeLabel}
          </StatusPill>
        ) : (
          <Eyebrow>Map</Eyebrow>
        )}
      </div>
      <div className="px-3 pb-3 pt-2">
        <svg viewBox="0 0 340 128" className="h-[128px] w-full">
          {connectors.map((connector, index) => {
            const isActive =
              connector.from.item.status === "live" ||
              connector.to.item.status === "live";
            const midX = (connector.from.x + connector.to.x) / 2;
            return (
              <path
                key={`${connector.from.item.key}-${connector.to.item.key}-${index}`}
                d={`M${connector.from.x} ${connector.from.y}H${midX}V${connector.to.y}H${connector.to.x}`}
                fill="none"
                stroke={isActive ? "var(--nba)" : "var(--mute-2)"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive ? 1.8 : 1}
                opacity={isActive ? 1 : 0.7}
              />
            );
          })}
          {nodes.map(({ item, x, y }) => {
            const active = item.status === "live";
            const label = labelOf(item).slice(0, 6);
            return (
              <g key={`${item.key}-${item.round}-${x}-${y}`}>
                <rect
                  x={x - 16}
                  y={y - 8}
                  width="32"
                  height="16"
                  rx="4"
                  fill={active ? "var(--nba)" : "var(--cream-2)"}
                  stroke="transparent"
                />
                <text
                  x={x}
                  y={y + 3.5}
                  textAnchor="middle"
                  fontFamily="var(--font-body), Inter, sans-serif"
                  fontSize="9"
                  fontWeight="700"
                  fill={active ? "#ffffff" : "var(--ink)"}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </AppCard>
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
    (series) =>
      series.round === "NBA Finals" || series.conference === "Finals"
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
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow color="var(--nba)">NBA Playoffs</Eyebrow>
          <h2
            className="mt-1 font-[family-name:var(--font-display)] text-5xl uppercase leading-none tracking-tight sm:text-6xl"
            style={{ color: "var(--ink)" }}
          >
            Series Board.
          </h2>
        </div>
        <div
          className="flex items-center gap-3 text-[12px] font-semibold"
          style={{ color: "var(--mute-1)" }}
        >
          <span>
            <strong style={{ color: "var(--ink)" }}>{allSeries.length}</strong> series
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--critical)" }}
            />
            <strong style={{ color: "var(--ink)" }}>{liveCount}</strong> live
          </span>
          <span>
            <strong style={{ color: "var(--ink)" }}>{upcomingCount}</strong> upcoming
          </span>
        </div>
      </header>

      <MiniBracketMap series={allSeries} />

      <Segmented<SeriesBoardTab>
        tabs={[
          { value: "east", label: "East" },
          { value: "west", label: "West" },
          { value: "finals", label: "Finals" },
        ]}
        value={activeBoard}
        onChange={setActiveBoard}
      />

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
        <section
          className="overflow-hidden rounded-[16px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        >
          <div
            className="px-4 py-3 sm:px-5"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <Eyebrow>Additional series</Eyebrow>
            <p
              className="mt-0.5 text-[20px] font-bold"
              style={{ color: "var(--ink)" }}
            >
              Series view
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
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
        <section
          className="overflow-hidden rounded-[16px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        >
          <div
            className="px-4 py-3 text-center sm:px-5"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <Eyebrow color="var(--nba)">The Finals</Eyebrow>
            <p
              className="mt-0.5 font-[family-name:var(--font-display)] text-[22px] uppercase tracking-tight sm:text-2xl"
              style={{ color: "var(--ink)" }}
            >
              NBA Finals
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="mx-auto grid max-w-md grid-cols-1 gap-3">
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

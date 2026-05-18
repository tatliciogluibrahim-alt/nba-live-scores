import type { SeriesInfo, Team } from "../types";
import {
  getRoundRank,
  getSeriesUrgencyRank,
} from "./series";

export type PersistedSeries = {
  key: string;
  abbrA: string;
  abbrB: string;
  teamA: Team & { wins: number };
  teamB: Team & { wins: number };
  conference: string;
  round: string;
  summary: string;
  isGame7: boolean;
  source: "api" | "inferred";
};

const NBA_SERIES_MEMORY_KEY = "no-noise-nba-series-memory-v1";
const NBA_SERIES_MEMORY_TTL_MS = 1000 * 60 * 60 * 24 * 90;

export function readSeriesMemory(): PersistedSeries[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NBA_SERIES_MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { updatedAt?: string; series?: PersistedSeries[] };
    if (!parsed?.series) return [];
    if (parsed.updatedAt) {
      const age = Date.now() - new Date(parsed.updatedAt).getTime();
      if (age > NBA_SERIES_MEMORY_TTL_MS) return [];
    }
    return Array.isArray(parsed.series) ? parsed.series : [];
  } catch {
    return [];
  }
}

export function writeSeriesMemory(series: PersistedSeries[]) {
  if (typeof window === "undefined") return;
  try {
    const deduped = Array.from(
      series.reduce((map, item) => map.set(item.key, item), new Map<string, PersistedSeries>()).values()
    );

    window.localStorage.setItem(
      NBA_SERIES_MEMORY_KEY,
      JSON.stringify({ updatedAt: new Date().toISOString(), series: deduped })
    );
  } catch {
    /* localStorage full or blocked: safe to ignore. */
  }
}

export function persistedFromSeries(series: SeriesInfo): PersistedSeries {
  return {
    key: series.key,
    abbrA: series.abbrA,
    abbrB: series.abbrB,
    teamA: series.teamA,
    teamB: series.teamB,
    conference: series.conference,
    round: series.round,
    summary: series.summary,
    isGame7: series.isGame7,
    source: series.source,
  };
}

function hydrateSeriesFromPersisted(series: PersistedSeries): SeriesInfo {
  return {
    ...series,
    status: "complete",
    nextGame: undefined,
    latestGame: undefined,
    games: [],
  };
}

export function mergeSeriesWithMemory(
  live: SeriesInfo[],
  remembered: PersistedSeries[]
): SeriesInfo[] {
  const liveKeys = new Set(live.map((series) => series.key));
  const extras = remembered
    .filter((series) => !liveKeys.has(series.key))
    .map(hydrateSeriesFromPersisted);

  return [...live, ...extras].sort((a, b) => {
    const roundDifference = getRoundRank(a.round) - getRoundRank(b.round);
    if (roundDifference !== 0) return roundDifference;

    const conferenceDifference = a.conference.localeCompare(b.conference);
    if (conferenceDifference !== 0) return conferenceDifference;

    return getSeriesUrgencyRank(a) - getSeriesUrgencyRank(b);
  });
}

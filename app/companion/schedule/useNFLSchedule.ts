"use client";

import { useEffect, useState } from "react";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";

// Reads /api/nfl-scores for the Schedule By-week view. One week per fetch
// (ESPN serves a full week); ?week=N pages. Polls faster when a game is
// live (during the season); idle pre-season.

const LIVE_INTERVAL_MS = 20_000;
const IDLE_INTERVAL_MS = 120_000;

export type NFLSchedule = {
  games: NFLGameLite[];
  week: number;
  seasonType: number;
};

async function fetchWeek(
  week: number | null,
  seasonType: number | null
): Promise<NFLSchedule> {
  try {
    const params = new URLSearchParams();
    if (week) params.set("week", String(week));
    // Only pin seasontype alongside a concrete week — a bare seasontype with
    // no week would fight ESPN's "current week" default.
    if (week && seasonType) params.set("seasontype", String(seasonType));
    const qs = params.toString();
    const url = qs ? `/api/nfl-scores?${qs}` : "/api/nfl-scores";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { games: [], week: week ?? 0, seasonType: seasonType ?? 0 };
    const json = (await res.json()) as Partial<NFLSchedule>;
    return {
      games: json.games ?? [],
      week: json.week ?? week ?? 0,
      seasonType: json.seasonType ?? seasonType ?? 0,
    };
  } catch {
    return { games: [], week: week ?? 0, seasonType: seasonType ?? 0 };
  }
}

export function useNFLSchedule(
  week: number | null,
  seasonType: number | null = null
): {
  schedule: NFLSchedule;
  hydrated: boolean;
} {
  const [data, setData] = useState<NFLSchedule>({ games: [], week: 0, seasonType: 0 });
  const [hydrated, setHydrated] = useState(false);

  // Immediate fetch when the requested week/season type changes (the poll
  // below keeps it fresh on its own cadence; a switch should not wait).
  useEffect(() => {
    let cancelled = false;
    fetchWeek(week, seasonType).then((next) => {
      if (cancelled) return;
      setData(next);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [week, seasonType]);

  useVisibilityPoll(
    async (isCancelled) => {
      const next = await fetchWeek(week, seasonType);
      if (isCancelled()) return;
      setData(next);
      setHydrated(true);
    },
    () => (data.games.some((g) => g.status === "live") ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS)
  );

  return { schedule: data, hydrated };
}

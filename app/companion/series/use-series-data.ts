"use client";

import { useMemo, useRef, useState } from "react";
import type { Game } from "../../nba/types";
import { buildSeriesPayload, type SeriesPayload } from "./series-data";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

type ApiResponse = {
  games?: Game[];
  seriesGames?: Game[];
};

async function fetchGames(): Promise<Game[]> {
  try {
    const res = await fetch("/api/live-scores", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as ApiResponse;
    // `seriesGames` is the wider window (3+ days) the legacy API already
    // builds for the bracket. Prefer it when present — gives us older
    // played games so we can fill earlier dot slots.
    return json.seriesGames && json.seriesGames.length > 0
      ? json.seriesGames
      : (json.games ?? []);
  } catch {
    return [];
  }
}

export function useSeriesData(seriesKey: string) {
  const [games, setGames] = useState<Game[]>([]);
  const gamesRef = useRef<Game[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useVisibilityPoll(
    async (isCancelled) => {
      const next = await fetchGames();
      if (isCancelled()) return;
      gamesRef.current = next;
      setGames(next);
      setHydrated(true);
    },
    // Live cadence while any game in the matchup is live, else idle.
    () =>
      gamesRef.current.some((g) => g.status === "live")
        ? LIVE_INTERVAL_MS
        : IDLE_INTERVAL_MS
  );

  const payload = useMemo<SeriesPayload | null>(() => {
    if (!hydrated) return null;
    return buildSeriesPayload(games, seriesKey);
  }, [games, hydrated, seriesKey]);

  return { payload, hydrated };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game } from "../../nba/types";
import { buildSeriesPayload, type SeriesPayload } from "./series-data";

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mounted = { current: true };

    async function load() {
      const next = await fetchGames();
      if (!mounted.current) return;
      setGames(next);
      setHydrated(true);
    }

    load();

    let interval: ReturnType<typeof setInterval>;
    function schedule() {
      const hasLive =
        mounted.current && games.some((g) => g.status === "live");
      const ms = hasLive ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
      interval = setInterval(() => {
        load();
        clearInterval(interval);
        schedule();
      }, ms);
    }
    schedule();

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = useMemo<SeriesPayload | null>(() => {
    if (!hydrated) return null;
    return buildSeriesPayload(games, seriesKey);
  }, [games, hydrated, seriesKey]);

  return { payload, hydrated };
}

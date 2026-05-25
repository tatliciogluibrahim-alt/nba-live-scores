"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Game } from "../../nba/types";
import { buildSeriesPayload, type SeriesPayload } from "./series-data";

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

type ApiResponse = {
  games?: Game[];
  seriesGames?: Game[];
};

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

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

  useEffect(() => {
    const mounted = { current: true };

    async function load() {
      const next = await fetchGames();
      if (!mounted.current) return;
      gamesRef.current = next;
      setGames(next);
      setHydrated(true);
    }

    if (pageIsVisible()) load();

    let timeout: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timeout);
      const hasLive =
        mounted.current && gamesRef.current.some((g) => g.status === "live");
      const ms = hasLive ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
      timeout = setTimeout(async () => {
        if (pageIsVisible()) await load();
        schedule();
      }, ms);
    }
    schedule();

    function handleVisibilityChange() {
      if (pageIsVisible()) {
        load();
        schedule();
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      mounted.current = false;
      clearTimeout(timeout);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, []);

  const payload = useMemo<SeriesPayload | null>(() => {
    if (!hydrated) return null;
    return buildSeriesPayload(games, seriesKey);
  }, [games, hydrated, seriesKey]);

  return { payload, hydrated };
}

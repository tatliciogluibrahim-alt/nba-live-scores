"use client";

import { useEffect, useMemo, useState } from "react";
import type { WCGameLite } from "../today/today-data";
import {
  buildCountryPayload,
  tournamentHasStarted,
  type CountryPayload,
} from "./country-data";

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

async function fetchWC(): Promise<WCGameLite[]> {
  try {
    const res = await fetch("/api/world-cup", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: WCGameLite[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

export function useCountryData(code: string) {
  const [games, setGames] = useState<WCGameLite[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mounted = { current: true };

    async function load() {
      const next = await fetchWC();
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

  const payload = useMemo<CountryPayload | null>(() => {
    if (!hydrated) return null;
    return buildCountryPayload(code, games);
  }, [code, games, hydrated]);

  const started = useMemo(() => tournamentHasStarted(games), [games]);

  return { payload, hydrated, tournamentStarted: started };
}

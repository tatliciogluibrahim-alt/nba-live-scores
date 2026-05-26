"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WCGameLite } from "../today/today-data";
import { wcFeedUrl } from "../dev/preview-mode";
import {
  buildCountryPayload,
  tournamentHasStarted,
  type CountryPayload,
} from "./country-data";

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

async function fetchWC(): Promise<WCGameLite[]> {
  try {
    // wcFeedUrl() honors ?preview=wc-day to swap in the simulation
    // harness data; real /api/world-cup otherwise.
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: WCGameLite[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

export function useCountryData(code: string) {
  const [games, setGames] = useState<WCGameLite[]>([]);
  const gamesRef = useRef<WCGameLite[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mounted = { current: true };

    async function load() {
      const next = await fetchWC();
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

  const payload = useMemo<CountryPayload | null>(() => {
    if (!hydrated) return null;
    return buildCountryPayload(code, games);
  }, [code, games, hydrated]);

  const started = useMemo(() => tournamentHasStarted(games), [games]);

  return { payload, hydrated, tournamentStarted: started };
}

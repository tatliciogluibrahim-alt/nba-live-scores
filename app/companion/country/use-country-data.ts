"use client";

import { useMemo, useRef, useState } from "react";
import type { WCGameLite } from "../today/today-data";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import {
  buildCountryPayload,
  tournamentHasStarted,
  type CountryPayload,
} from "./country-data";

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

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

  useVisibilityPoll(
    async (isCancelled) => {
      const next = await fetchWC();
      if (isCancelled()) return;
      gamesRef.current = next;
      setGames(next);
      setHydrated(true);
    },
    () =>
      gamesRef.current.some((g) => g.status === "live")
        ? LIVE_INTERVAL_MS
        : IDLE_INTERVAL_MS
  );

  const payload = useMemo<CountryPayload | null>(() => {
    if (!hydrated) return null;
    return buildCountryPayload(code, games);
  }, [code, games, hydrated]);

  const started = useMemo(() => tournamentHasStarted(games), [games]);

  return { payload, hydrated, tournamentStarted: started };
}

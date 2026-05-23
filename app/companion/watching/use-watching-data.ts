"use client";

import { useEffect, useMemo, useState } from "react";
import { usePinned } from "../providers";
import type { NBAGame, WCGameLite } from "../today/today-data";
import {
  buildWatchingPayload,
  type WatchingPayload,
} from "./watching-data";

// Same polling cadence as Today: 10s when any pinned game is live, 30s idle.
const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

const EMPTY: WatchingPayload = { items: [], stalePins: [] };

async function fetchNBA(): Promise<NBAGame[]> {
  try {
    const res = await fetch("/api/live-scores", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: NBAGame[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

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

type Fetched = { nba: NBAGame[]; wc: WCGameLite[]; updatedAt: Date | null };

export function useWatchingData() {
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const [data, setData] = useState<Fetched>({ nba: [], wc: [], updatedAt: null });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const mounted = { current: true };

    async function load() {
      const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
      if (!mounted.current) return;
      setData({ nba, wc, updatedAt: new Date() });
      setHasLoadedOnce(true);
    }

    load();

    let interval: ReturnType<typeof setInterval>;
    function schedule() {
      const hasLive =
        mounted.current &&
        (data.nba.some((g) => g.status === "live") ||
          data.wc.some((g) => g.status === "live"));
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
    // We intentionally do not depend on `data` here — that would reset the
    // polling cadence on every tick. The schedule re-reads `data` each cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = useMemo<WatchingPayload>(() => {
    if (!hasLoadedOnce || !pinnedHydrated) return EMPTY;
    return buildWatchingPayload({ nba: data.nba, wc: data.wc, pinned });
  }, [hasLoadedOnce, pinnedHydrated, data.nba, data.wc, pinned]);

  return {
    payload,
    hydrated: hasLoadedOnce && pinnedHydrated,
    updatedAt: data.updatedAt,
  };
}

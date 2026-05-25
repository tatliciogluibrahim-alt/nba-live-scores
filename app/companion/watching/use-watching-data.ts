"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePinned } from "../providers";
import type { NBAGame, WCGameLite } from "../today/today-data";
import {
  buildWatchingPayload,
  type WatchingPayload,
} from "./watching-data";

// Same polling cadence as Today: 10s when any pinned game is live, 30s idle.
const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

const EMPTY: WatchingPayload = {
  items: [],
  stalePins: [],
  liveCount: 0,
  closestLive: null,
};

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

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export function useWatchingData() {
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const [data, setData] = useState<Fetched>({ nba: [], wc: [], updatedAt: null });
  const dataRef = useRef<Fetched>(data);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const mounted = { current: true };

    async function load() {
      const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
      if (!mounted.current) return;
      const next = { nba, wc, updatedAt: new Date() };
      dataRef.current = next;
      setData(next);
      setHasLoadedOnce(true);
    }

    if (pageIsVisible()) load();

    let timeout: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timeout);
      const current = dataRef.current;
      const hasLive =
        mounted.current &&
        (current.nba.some((g) => g.status === "live") ||
          current.wc.some((g) => g.status === "live"));
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

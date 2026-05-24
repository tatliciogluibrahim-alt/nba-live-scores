"use client";

import { useEffect, useMemo, useState } from "react";
import { useFollows, usePinned } from "../providers";
import {
  buildTodayPayload,
  type NBAGame,
  type TodayPayload,
  type WCGameLite,
} from "./today-data";

// Empty payload used during loading and as the safe fallback when both
// API calls fail. Keeps the page shape stable so we don't flash empties.
const EMPTY: TodayPayload = {
  hero: null,
  youFollow: [],
  upNext: [],
  quietWrap: [],
  reminder: null,
  isQuietDay: true,
};

// Polling cadence per STRATEGY.md: 10s when a live game is on the surface,
// 30s otherwise. We hard-cap the interval to keep this calm.
const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

type FetchedData = { nba: NBAGame[]; wc: WCGameLite[]; updatedAt: Date | null };

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

export function useTodayData() {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const [data, setData] = useState<FetchedData>({
    nba: [],
    wc: [],
    updatedAt: null,
  });
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
    // We deliberately do not include `data` here — that would reset the
    // interval on every poll. The schedule re-reads `data` each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = useMemo<TodayPayload>(() => {
    if (!hasLoadedOnce || !followsHydrated || !pinnedHydrated) return EMPTY;
    return buildTodayPayload({
      nba: data.nba,
      wc: data.wc,
      follows,
      pinned,
    });
  }, [
    hasLoadedOnce,
    followsHydrated,
    pinnedHydrated,
    data.nba,
    data.wc,
    follows,
    pinned,
  ]);

  return {
    payload,
    hydrated: hasLoadedOnce && followsHydrated && pinnedHydrated,
    updatedAt: data.updatedAt,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  slateComplete: false,
  finalsCount: 0,
};

// Polling cadence per STRATEGY.md: 10s when a live game is on the surface,
// 30s otherwise. We hard-cap the interval to keep this calm.
const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

type FetchedData = { nba: NBAGame[]; wc: WCGameLite[]; updatedAt: Date | null };

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

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
  const dataRef = useRef<FetchedData>(data);
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

  // Manual refetch — wired to PullToRefresh. Runs in parallel with the
  // polling timer; the last write wins, which is fine because both
  // produce the same shape.
  const refetch = useCallback(async () => {
    const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
    const next: FetchedData = { nba, wc, updatedAt: new Date() };
    dataRef.current = next;
    setData(next);
    setHasLoadedOnce(true);
  }, []);

  return {
    payload,
    hydrated: hasLoadedOnce && followsHydrated && pinnedHydrated,
    updatedAt: data.updatedAt,
    refetch,
  };
}

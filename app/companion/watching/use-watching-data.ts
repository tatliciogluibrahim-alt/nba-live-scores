"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePinned } from "../providers";
import type { Game } from "../../nba/types";
import type { NBAGame, WCGameLite } from "../today/today-data";
import {
  buildWatchingPayload,
  nbaToPinned,
  type PinnedItem,
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

// Pull persisted final-game snapshots for IDs the live feeds didn't
// resolve. Lets historical pins keep rendering as game cards instead
// of dead "No longer in the live feed." rows.
async function fetchSnapshot(id: string): Promise<Game | null> {
  try {
    const res = await fetch(`/api/game-snapshot/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok: boolean;
      found: boolean;
      game?: Game;
    };
    return json.found && json.game ? json.game : null;
  } catch {
    return null;
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
  // Snapshot pins: cards resolved from KV snapshots for pinned games no
  // longer in either live feed. Kept separate from `data` so a snapshot
  // resolution doesn't get blown away by the next poll of the live feeds.
  const [snapshotItems, setSnapshotItems] = useState<PinnedItem[]>([]);

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

  const livePayload = useMemo<WatchingPayload>(() => {
    if (!hasLoadedOnce || !pinnedHydrated) return EMPTY;
    return buildWatchingPayload({ nba: data.nba, wc: data.wc, pinned });
  }, [hasLoadedOnce, pinnedHydrated, data.nba, data.wc, pinned]);

  // Resolve any stale pins (pinned IDs the live feeds don't know about
  // anymore) against the snapshot store. Resolved snapshots are promoted
  // to first-class pinned items so the user sees a final-state card
  // instead of "No longer in the live feed." Already-resolved snapshot
  // IDs are kept in state across polls so a brief feed flicker doesn't
  // drop the historical card; pins that disappear from the user's pinned
  // list are filtered out at merge time below.
  useEffect(() => {
    const stale = livePayload.stalePins;
    if (stale.length === 0) return;
    const known = new Set(snapshotItems.map((i) => i.id));
    const toFetch = stale.filter((p) => !known.has(p.id));
    if (toFetch.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        toFetch.map(async (p) => {
          const snap = await fetchSnapshot(p.id);
          return snap
            ? nbaToPinned(snap as unknown as NBAGame, p.pinnedAt)
            : null;
        })
      );
      if (cancelled) return;
      const resolved = results.filter((r): r is PinnedItem => r !== null);
      if (resolved.length === 0) return;
      setSnapshotItems((prev) => {
        const byId = new Map(prev.map((i) => [i.id, i]));
        for (const r of resolved) byId.set(r.id, r);
        return Array.from(byId.values());
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [livePayload.stalePins, snapshotItems]);

  const payload = useMemo<WatchingPayload>(() => {
    if (snapshotItems.length === 0) return livePayload;
    // Only include snapshots for IDs the user is still pinning, and that
    // aren't already in the live feed (a snapshot can return if the user
    // re-pins an old game; if the live feed later picks it up again the
    // live version wins).
    const pinnedIds = new Set(pinned.map((p) => p.gameId));
    const liveItemIds = new Set(livePayload.items.map((i) => i.id));
    const useable = snapshotItems
      .filter((i) => pinnedIds.has(i.id) && !liveItemIds.has(i.id))
      .sort((a, b) => b.pinnedAt - a.pinnedAt);
    if (useable.length === 0) return livePayload;
    const snapshotIds = new Set(useable.map((i) => i.id));
    const stillStale = livePayload.stalePins.filter(
      (p) => !snapshotIds.has(p.id)
    );
    return {
      ...livePayload,
      items: [...livePayload.items, ...useable],
      stalePins: stillStale,
    };
  }, [livePayload, snapshotItems, pinned]);

  // Manual refetch — wired to PullToRefresh. Runs alongside the polling
  // timer; identical fetch path, last write wins.
  const refetch = useCallback(async () => {
    const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
    const next: Fetched = { nba, wc, updatedAt: new Date() };
    dataRef.current = next;
    setData(next);
    setHasLoadedOnce(true);
  }, []);

  return {
    payload,
    hydrated: hasLoadedOnce && pinnedHydrated,
    updatedAt: data.updatedAt,
    refetch,
  };
}

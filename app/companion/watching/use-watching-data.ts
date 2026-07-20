"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { FEED_KEYS, readFeed, writeFeed } from "../hooks/feed-cache";
import type { Game } from "../../nba/types";
import type { NBAGame, WCGameLite } from "../today/today-data";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
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
    const json = (await res.json()) as {
      games?: NBAGame[];
      seriesGames?: NBAGame[];
    };
    const games = json.games ?? [];
    // Write the same { games, recent } shape Today caches so neither
    // hook clobbers the other's richer entry in the shared feed cache.
    writeFeed(FEED_KEYS.liveScores, {
      games,
      recent: json.seriesGames ?? games,
    });
    return games;
  } catch {
    return [];
  }
}

async function fetchWC(): Promise<WCGameLite[]> {
  try {
    // wcFeedUrl() honors ?preview=wc-day to swap in simulation data
    // when the harness is active.
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: WCGameLite[] };
    const games = json.games ?? [];
    writeFeed(FEED_KEYS.worldCup, games);
    return games;
  } catch {
    return [];
  }
}

// Current-week NFL games (Phase 22). Empty out of season; a pinned NFL game
// not in this week's slate resolves via the same path as any other stale pin.
async function fetchNFL(): Promise<NFLGameLite[]> {
  try {
    const res = await fetch("/api/nfl-scores", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: NFLGameLite[] };
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

type Fetched = {
  nba: NBAGame[];
  wc: WCGameLite[];
  nfl: NFLGameLite[];
  updatedAt: Date | null;
};

export function useWatchingData() {
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  // Seed from the shared feed cache so a tab switch paints the last-known
  // slate instantly (the poll refreshes within its interval).
  const [data, setData] = useState<Fetched>(() => {
    const ls = readFeed<{ games: NBAGame[]; recent: NBAGame[] }>(
      FEED_KEYS.liveScores
    );
    const wc = readFeed<WCGameLite[]>(FEED_KEYS.worldCup);
    // NFL isn't cached in the shared feed (Today's cache is nba+wc); it
    // loads on the first poll. Seed empty so the seed shape stays cheap.
    if (!ls && !wc) return { nba: [], wc: [], nfl: [], updatedAt: null };
    return { nba: ls?.games ?? [], wc: wc ?? [], nfl: [], updatedAt: new Date() };
  });
  const dataRef = useRef<Fetched>(data);
  // Last-committed feed signature — skip the re-render + updatedAt bump on a
  // byte-identical (quiet) tick.
  const sigRef = useRef<string>("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(
    () => data.updatedAt !== null
  );
  // Snapshot pins: cards resolved from KV snapshots for pinned games no
  // longer in either live feed. Kept separate from `data` so a snapshot
  // resolution doesn't get blown away by the next poll of the live feeds.
  const [snapshotItems, setSnapshotItems] = useState<PinnedItem[]>([]);

  // Single fetch+commit path shared by the poll loop and refetch.
  const loadInto = useCallback(async (isCancelled: () => boolean) => {
    const [nba, wc, nfl] = await Promise.all([fetchNBA(), fetchWC(), fetchNFL()]);
    if (isCancelled()) return;
    const sig =
      JSON.stringify(nba) + "|" + JSON.stringify(wc) + "|" + JSON.stringify(nfl);
    if (sig === sigRef.current && dataRef.current.updatedAt !== null) {
      setHasLoadedOnce(true);
      return;
    }
    sigRef.current = sig;
    const next = { nba, wc, nfl, updatedAt: new Date() };
    dataRef.current = next;
    setData(next);
    setHasLoadedOnce(true);
  }, []);

  // Live-feed poll. The snapshot-resolution effect below is separate
  // and untouched — it reacts to livePayload.stalePins, not to this
  // timer.
  useVisibilityPoll(
    (isCancelled) => loadInto(isCancelled),
    () => {
      const current = dataRef.current;
      const hasLive =
        current.nba.some((g) => g.status === "live") ||
        current.wc.some((g) => g.status === "live") ||
        current.nfl.some((g) => g.status === "live");
      return hasLive ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    }
  );

  const livePayload = useMemo<WatchingPayload>(() => {
    if (!hasLoadedOnce || !pinnedHydrated) return EMPTY;
    return buildWatchingPayload({
      nba: data.nba,
      wc: data.wc,
      nfl: data.nfl,
      pinned,
    });
  }, [hasLoadedOnce, pinnedHydrated, data.nba, data.wc, data.nfl, pinned]);

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
  // timer; identical fetch path, last write wins. Never cancelled.
  const refetch = useCallback(() => loadInto(() => false), [loadInto]);

  return {
    payload,
    hydrated: hasLoadedOnce && pinnedHydrated,
    updatedAt: data.updatedAt,
    refetch,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { FEED_KEYS, readSeedFeeds, writeFeed } from "../hooks/feed-cache";
import { feedsDue, SLOW_FEED_CACHE_MS } from "../hooks/feed-cadence";
import type { Game } from "../../nba/types";
import type { NBAGame, WCGameLite } from "../today/today-data";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import { nextNFLWeek } from "../following/data/nfl-dates";
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

async function fetchNBA(cacheMs?: number): Promise<NBAGame[]> {
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
    writeFeed(
      FEED_KEYS.liveScores,
      { games, recent: json.seriesGames ?? games },
      cacheMs
    );
    return games;
  } catch {
    return [];
  }
}

async function fetchWC(cacheMs?: number): Promise<WCGameLite[]> {
  try {
    // wcFeedUrl() honors ?preview=wc-day to swap in simulation data
    // when the harness is active.
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: WCGameLite[] };
    const games = json.games ?? [];
    writeFeed(FEED_KEYS.worldCup, games, cacheMs);
    return games;
  } catch {
    return [];
  }
}

// Current-week NFL games (Phase 22), plus a one-step lookahead. ESPN keeps
// serving the current week for days after its last game, so a game the user
// tracked from Today's NEXT pointer (next week's) would otherwise read as a
// stale pin the moment they opened Watching. Only fetched when the current
// week has nothing left to play. Anything further out still resolves via the
// same path as any other stale pin.
async function fetchNFL(): Promise<NFLGameLite[]> {
  try {
    const res = await fetch("/api/nfl-scores", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      games?: NFLGameLite[];
      week?: number;
      seasonType?: number;
    };
    const games = json.games ?? [];
    const done = (list: NFLGameLite[]) => {
      writeFeed(FEED_KEYS.nfl, list);
      return list;
    };
    if (games.some((g) => g.status !== "final")) return done(games);
    const next = nextNFLWeek(json.seasonType ?? 0, json.week ?? 0);
    if (!next) return done(games);
    const res2 = await fetch(
      `/api/nfl-scores?week=${next.week}&seasontype=${next.seasonType}`,
      { cache: "no-store" }
    );
    if (!res2.ok) return done(games);
    const json2 = (await res2.json()) as { games?: NFLGameLite[] };
    return done([...games, ...(json2.games ?? [])]);
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
  // Seeds only with all three feeds cached (readSeedFeeds), so a pin is
  // never judged against a feed that hasn't loaded yet.
  const [data, setData] = useState<Fetched>(() => {
    const seed = readSeedFeeds<
      { games: NBAGame[]; recent: NBAGame[] },
      WCGameLite[],
      NFLGameLite[]
    >();
    if (!seed) return { nba: [], wc: [], nfl: [], updatedAt: null };
    return {
      nba: seed.liveScores.games,
      wc: seed.worldCup,
      nfl: seed.nfl,
      updatedAt: new Date(),
    };
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

  // Poll cadence (feed-cadence.ts). Watching needs a sport fresh only when a
  // tracked game is in it: with every pin placed in the NFL feed, NBA and
  // Summer Soccer refresh every few minutes instead of every tick.
  const pinnedIdsRef = useRef<string[] | null>(null);
  useEffect(() => {
    pinnedIdsRef.current = pinnedHydrated ? pinned.map((p) => p.gameId) : null;
  }, [pinned, pinnedHydrated]);
  const interest = useCallback((): ReadonlySet<string> | null => {
    const ids = pinnedIdsRef.current;
    if (ids === null) return null;
    const nflIds = new Set(dataRef.current.nfl.map((g) => g.id));
    return ids.every((id) => nflIds.has(id)) ? new Set(["nfl"]) : null;
  }, []);
  const lastFetched = useRef({ nba: 0, wc: 0 });

  // Single fetch+commit path shared by the poll loop and refetch.
  const loadInto = useCallback(async (isCancelled: () => boolean) => {
    const sports = interest();
    const now = Date.now();
    const due = feedsDue({ sports, lastFetched: lastFetched.current, now });
    const cacheMs = (sport: string) =>
      sports === null || sports.has(sport) ? undefined : SLOW_FEED_CACHE_MS;
    if (due.nba) lastFetched.current.nba = now;
    if (due.wc) lastFetched.current.wc = now;
    const [nba, wc, nfl] = await Promise.all([
      due.nba ? fetchNBA(cacheMs("nba")) : Promise.resolve(dataRef.current.nba),
      due.wc ? fetchWC(cacheMs("wc")) : Promise.resolve(dataRef.current.wc),
      fetchNFL(),
    ]);
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
  }, [interest]);

  // Live-feed poll. The snapshot-resolution effect below is separate
  // and untouched — it reacts to livePayload.stalePins, not to this
  // timer.
  useVisibilityPoll(
    (isCancelled) => loadInto(isCancelled),
    () => {
      // Only a tracked game being live speeds the poll up.
      const current = dataRef.current;
      const tracked = new Set(pinnedIdsRef.current ?? []);
      const liveTracked = (games: { id: string; status: string }[]) =>
        games.some((g) => tracked.has(g.id) && g.status === "live");
      const hasLive =
        liveTracked(current.nba) || liveTracked(current.wc) || liveTracked(current.nfl);
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

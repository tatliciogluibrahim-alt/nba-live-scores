"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useFollows, usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { FEED_KEYS, readFeed, writeFeed } from "../hooks/feed-cache";
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
  restingState: false,
  slateComplete: false,
  finalsCount: 0,
  closing: null,
  pinnedSummary: {
    total: 0,
    live: 0,
    upcoming: 0,
    final: 0,
    unresolved: 0,
    primary: null,
  },
  knockoutMoments: [],
    scoreboard: [],
};

// Polling cadence per STRATEGY.md: 10s when a live game is on the surface,
// 30s otherwise. We hard-cap the interval to keep this calm.
const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

type FetchedData = {
  nba: NBAGame[];
  /** Wider window (seriesGames from the live-scores API). Used by
   *  Quiet Wrap so a game that wrapped 2–3 days ago is still
   *  browsable from Today instead of vanishing the moment ESPN drops
   *  it from the current-week feed. */
  nbaRecent: NBAGame[];
  wc: WCGameLite[];
  updatedAt: Date | null;
};

async function fetchNBA(): Promise<{ games: NBAGame[]; recent: NBAGame[] }> {
  try {
    const res = await fetch("/api/live-scores", { cache: "no-store" });
    if (!res.ok) return { games: [], recent: [] };
    const json = (await res.json()) as {
      games?: NBAGame[];
      seriesGames?: NBAGame[];
    };
    const games = json.games ?? [];
    // seriesGames covers -14 to +7 days; use it as the recent-finals
    // surface so Quiet Wrap can show games that just wrapped even
    // when they fall outside the current week boundary.
    const recent = json.seriesGames ?? games;
    const result = { games, recent };
    writeFeed(FEED_KEYS.liveScores, result);
    return result;
  } catch {
    return { games: [], recent: [] };
  }
}

async function fetchWC(): Promise<WCGameLite[]> {
  try {
    // wcFeedUrl() swaps to /api/preview/world-cup when the URL has
    // ?preview=wc-day, so we can feel the live-day UX without
    // waiting for kickoff. Real path otherwise.
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

// Seed initial state from the shared feed cache so a tab switch paints
// the last-known slate instantly instead of an empty shell. The poll
// refreshes within its interval; if nothing's cached (fresh load) we
// fall back to empty + loading shell as before.
function seedData(): FetchedData {
  const ls = readFeed<{ games: NBAGame[]; recent: NBAGame[] }>(
    FEED_KEYS.liveScores
  );
  const wc = readFeed<WCGameLite[]>(FEED_KEYS.worldCup);
  if (!ls && !wc) {
    return { nba: [], nbaRecent: [], wc: [], updatedAt: null };
  }
  return {
    nba: ls?.games ?? [],
    nbaRecent: ls?.recent ?? [],
    wc: wc ?? [],
    updatedAt: new Date(),
  };
}

export function useTodayData() {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const [data, setData] = useState<FetchedData>(seedData);
  const dataRef = useRef<FetchedData>(data);
  // Last-committed feed signatures — used to skip the re-render + updatedAt
  // bump when a poll returns byte-identical data (a quiet tick).
  const nbaSigRef = useRef<string>("");
  const wcSigRef = useRef<string>("");
  // If we seeded from cache, treat the tab as already loaded so no
  // loading shell flashes before the first poll lands.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(
    () => data.updatedAt !== null
  );

  // Single fetch+commit path shared by the poll loop and the manual
  // refetch. `isCancelled` guards the post-await setState (the poll
  // passes the primitive's accessor; refetch passes a no-op since a
  // user-initiated pull should always apply).
  const loadInto = useCallback(async (isCancelled: () => boolean) => {
    // Settle the two feeds INDEPENDENTLY so the slate paints the moment
    // the first feed with content lands, instead of blocking on the
    // slower one (the WC route fans out a 14-day window). We only flip
    // hasLoadedOnce on a non-empty result, so the loading shell holds
    // until there's something to show — no flash of "All quiet" while
    // the meaningful feed is still in flight (NBA returns fast+empty in
    // the offseason; WC returns fast+empty out of season).
    const applyNba = (r: Awaited<ReturnType<typeof fetchNBA>>) => {
      if (isCancelled()) return;
      // Skip the commit (re-render + updatedAt re-stamp) when the feed is
      // byte-identical to the last — a quiet tick shouldn't rebuild the payload
      // or churn the masthead date. A live minute or score change alters the
      // stringified feed, so live updates still apply.
      const sig = JSON.stringify(r.games) + "|" + JSON.stringify(r.recent);
      if (sig === nbaSigRef.current && dataRef.current.updatedAt !== null) {
        if (r.games.length > 0 || r.recent.length > 0) setHasLoadedOnce(true);
        return;
      }
      nbaSigRef.current = sig;
      dataRef.current = {
        ...dataRef.current,
        nba: r.games,
        nbaRecent: r.recent,
        updatedAt: new Date(),
      };
      setData(dataRef.current);
      if (r.games.length > 0 || r.recent.length > 0) setHasLoadedOnce(true);
    };
    const applyWc = (wc: WCGameLite[]) => {
      if (isCancelled()) return;
      const sig = JSON.stringify(wc);
      if (sig === wcSigRef.current && dataRef.current.updatedAt !== null) {
        if (wc.length > 0) setHasLoadedOnce(true);
        return;
      }
      wcSigRef.current = sig;
      dataRef.current = { ...dataRef.current, wc, updatedAt: new Date() };
      setData(dataRef.current);
      if (wc.length > 0) setHasLoadedOnce(true);
    };
    await Promise.allSettled([
      fetchNBA().then(applyNba),
      fetchWC().then(applyWc),
    ]);
    // Both settled — flip even if both came back empty so a genuinely
    // quiet day leaves the loading shell instead of hanging.
    if (!isCancelled()) setHasLoadedOnce(true);
  }, []);

  useVisibilityPoll(
    (isCancelled) => loadInto(isCancelled),
    () => {
      const current = dataRef.current;
      const hasLive =
        current.nba.some((g) => g.status === "live") ||
        current.wc.some((g) => g.status === "live");
      return hasLive ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    }
  );

  const payload = useMemo<TodayPayload>(() => {
    if (!hasLoadedOnce || !followsHydrated || !pinnedHydrated) return EMPTY;
    return buildTodayPayload({
      nba: data.nba,
      nbaRecent: data.nbaRecent,
      wc: data.wc,
      follows,
      pinned,
    });
  }, [
    hasLoadedOnce,
    followsHydrated,
    pinnedHydrated,
    data.nba,
    data.nbaRecent,
    data.wc,
    follows,
    pinned,
  ]);

  // Manual refetch — wired to PullToRefresh. Runs in parallel with the
  // polling timer; the last write wins, which is fine because both
  // produce the same shape. Never cancelled (a user pull should apply).
  const refetch = useCallback(() => loadInto(() => false), [loadInto]);

  return {
    payload,
    hydrated: hasLoadedOnce && followsHydrated && pinnedHydrated,
    updatedAt: data.updatedAt,
    refetch,
  };
}

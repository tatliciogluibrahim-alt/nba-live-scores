"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFollows, usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { FEED_KEYS, readFeed, writeFeed } from "../hooks/feed-cache";
import { localDayKey } from "../hooks/local-day";
import {
  buildTodayPayload,
  type NBAGame,
  type TodayPayload,
  type WCGameLite,
} from "./today-data";
import type { WCChampion } from "../../lib/wc-champion";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import { nextNFLWeek } from "../following/data/nfl-dates";

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
  recapFinals: [],
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
  reliancePrompt: null,
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
  /** Frozen tournament champion (from the WC feed), or null until the final
   *  is decided. Drives the WC wind-down moment. */
  champion: WCChampion | null;
  /** Current-week NFL games (Phase 22). Empty out of season. */
  nfl: NFLGameLite[];
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

async function fetchWC(): Promise<{
  games: WCGameLite[];
  champion: WCChampion | null;
}> {
  try {
    // wcFeedUrl() swaps to /api/preview/world-cup when the URL has
    // ?preview=wc-day, so we can feel the live-day UX without
    // waiting for kickoff. Real path otherwise.
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return { games: [], champion: null };
    const json = (await res.json()) as {
      games?: WCGameLite[];
      champion?: WCChampion | null;
    };
    const games = json.games ?? [];
    writeFeed(FEED_KEYS.worldCup, games);
    return { games, champion: json.champion ?? null };
  } catch {
    return { games: [], champion: null };
  }
}

type NFLWeekPayload = {
  games?: NFLGameLite[];
  week?: number;
  seasonType?: number;
};

// The NFL feed is a WEEK, not a day — and ESPN keeps serving the current
// week for days after its last game ends. So between weeks (Tue/Wed) every
// game reads final and a followed team looks like it has nothing coming up,
// while it actually kicks off Thursday. When the current week has nothing
// upcoming left, pull the next week too so Today's NEXT pointer keeps
// working. One extra request, and only on those in-between days.
async function fetchNFL(): Promise<{ games: NFLGameLite[] }> {
  try {
    const res = await fetch("/api/nfl-scores", { cache: "no-store" });
    if (!res.ok) return { games: [] };
    const json = (await res.json()) as NFLWeekPayload;
    const games = json.games ?? [];
    if (games.some((g) => g.status !== "final")) return { games };

    const next = nextNFLWeek(json.seasonType ?? 0, json.week ?? 0);
    if (!next) return { games };
    const res2 = await fetch(
      `/api/nfl-scores?week=${next.week}&seasontype=${next.seasonType}`,
      { cache: "no-store" }
    );
    if (!res2.ok) return { games };
    const json2 = (await res2.json()) as NFLWeekPayload;
    // Keep the wrapped week: Quiet Wrap reads recent finals from the same
    // array, and its own 3-day window decides what still belongs there.
    return { games: [...games, ...(json2.games ?? [])] };
  } catch {
    return { games: [] };
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
    return { nba: [], nbaRecent: [], wc: [], champion: null, nfl: [], updatedAt: null };
  }
  return {
    nba: ls?.games ?? [],
    nbaRecent: ls?.recent ?? [],
    wc: wc ?? [],
    // Champion isn't cached (server-derived); it repopulates on the first
    // poll. Null until then.
    champion: null,
    nfl: [],
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
  const nflSigRef = useRef<string>("");
  // If we seeded from cache, treat the tab as already loaded so no
  // loading shell flashes before the first poll lands.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(
    () => data.updatedAt !== null
  );
  // Today composition is calendar-sensitive even when both feeds are byte-
  // identical. Re-key at local midnight (and immediately on app resume) so
  // the masthead can never advance to a new date while yesterday's slate
  // remains memoized underneath it.
  const [dayKey, setDayKey] = useState(() => localDayKey(new Date()));

  useEffect(() => {
    const refreshDay = () => setDayKey(localDayKey(new Date()));
    const tick = setInterval(refreshDay, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshDay();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

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
    const applyWc = (res: {
      games: WCGameLite[];
      champion: WCChampion | null;
    }) => {
      if (isCancelled()) return;
      const { games: wc, champion } = res;
      // Champion in the signature so its arrival commits (rebuilds the
      // payload → the wind-down moment appears) even on a byte-identical slate.
      const sig = JSON.stringify(wc) + "|" + (champion?.code ?? "");
      if (sig === wcSigRef.current && dataRef.current.updatedAt !== null) {
        if (wc.length > 0) setHasLoadedOnce(true);
        return;
      }
      wcSigRef.current = sig;
      dataRef.current = { ...dataRef.current, wc, champion, updatedAt: new Date() };
      setData(dataRef.current);
      if (wc.length > 0) setHasLoadedOnce(true);
    };
    const applyNfl = (res: { games: NFLGameLite[] }) => {
      if (isCancelled()) return;
      const sig = JSON.stringify(res.games);
      if (sig === nflSigRef.current && dataRef.current.updatedAt !== null) {
        if (res.games.length > 0) setHasLoadedOnce(true);
        return;
      }
      nflSigRef.current = sig;
      dataRef.current = { ...dataRef.current, nfl: res.games, updatedAt: new Date() };
      setData(dataRef.current);
      if (res.games.length > 0) setHasLoadedOnce(true);
    };
    await Promise.allSettled([
      fetchNBA().then(applyNba),
      fetchWC().then(applyWc),
      fetchNFL().then(applyNfl),
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
        current.wc.some((g) => g.status === "live") ||
        current.nfl.some((g) => g.status === "live");
      return hasLive ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    }
  );

  const payload = useMemo<TodayPayload>(() => {
    if (!hasLoadedOnce || !followsHydrated || !pinnedHydrated) return EMPTY;
    // Explicit invalidation token: feed bytes can remain unchanged across
    // midnight, but the meaning of "Today", "Earlier", and "Next" cannot.
    void dayKey;
    return buildTodayPayload({
      nba: data.nba,
      nbaRecent: data.nbaRecent,
      wc: data.wc,
      nfl: data.nfl,
      follows,
      pinned,
      champion: data.champion,
      now: new Date(),
    });
  }, [
    hasLoadedOnce,
    followsHydrated,
    pinnedHydrated,
    data.nba,
    data.nbaRecent,
    data.wc,
    data.nfl,
    data.champion,
    dayKey,
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

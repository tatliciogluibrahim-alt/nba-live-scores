"use client";

import { useEffect, useState } from "react";
import type { GameLeader, GamePlay } from "../../nba/types";

// Lightweight wrapper around /api/nba-game-detail.
//
// Historically this only surfaced plays + broadcasts. As of Phase 21B
// it also surfaces `leaders` — the per-game scoring / assists /
// rebounds leaders — because HighlightsStack needs them for live-game
// player highlights. ESPN's /api/live-scores `leaders` field tends to
// lag mid-game (snapshot at last scoreboard refresh, not real-time),
// while /api/nba-game-detail hits ESPN's summary endpoint which stays
// fresher. NBALiveCompanion merges these on top of the snapshot
// leaders before rendering, so HighlightsStack can show "SGA · 30
// PTS, 6 AST" while the game is still being played.
//
// This is also retroactively useful: any past game the user opens
// re-fetches detail from ESPN. For playoff games inside ESPN's
// retention window (typically multiple weeks), the highlight system
// upgrades from team-stat fallback ("OKC cold from three") to player
// lines ("SGA · 30 PTS, 6 AST") automatically.

export type NBADetail = {
  plays: GamePlay[];
  broadcasts: string[];
  /** Per-game leaders fresh from the ESPN summary endpoint. May be
   *  empty (early in a game, or when ESPN hasn't populated it yet) —
   *  callers should fall back to the live-scores snapshot in that
   *  case. */
  leaders: GameLeader[];
};

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

type FullResponse = {
  broadcasts?: string[];
  plays?: GamePlay[];
  leaders?: GameLeader[];
  // Other fields exist on the API response but are intentionally not
  // typed here so we don't accidentally surface them in the UI.
};

async function fetchDetail(eventId: string): Promise<NBADetail | null> {
  try {
    const res = await fetch(
      `/api/nba-game-detail?event=${encodeURIComponent(eventId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as FullResponse;
    return {
      plays: json.plays ?? [],
      broadcasts: json.broadcasts ?? [],
      leaders: json.leaders ?? [],
    };
  } catch {
    return null;
  }
}

export function useNBADetail(eventId: string | null, isLive: boolean) {
  const [detail, setDetail] = useState<NBADetail | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Unix ms timestamp of the last successful fetch — drives the freshness
  // indicator on the live game detail. null until the first fetch lands.
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  useEffect(() => {
    if (!eventId) {
      // Defensive — every caller passes a real id. localStorage hydration
      // pattern justifies the eslint-disable here (one-time sync).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      setHydrated(true);
      return;
    }
    const mounted = { current: true };

    async function load() {
      const next = await fetchDetail(eventId as string);
      if (!mounted.current) return;
      setDetail(next);
      setHydrated(true);
      if (next !== null) setLastFetched(Date.now());
    }

    if (pageIsVisible()) load();

    // Poll only while the page is visible. Final games are stable, but
    // upcoming games get a slower refresh so status flips without reload.
    let interval: ReturnType<typeof setInterval> | null = null;
    const intervalMs = isLive ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    interval = setInterval(() => {
      if (pageIsVisible()) load();
    }, intervalMs);

    function handleVisibilityChange() {
      if (pageIsVisible()) load();
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      mounted.current = false;
      if (interval) clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [eventId, isLive]);

  return { detail, hydrated, lastFetched };
}

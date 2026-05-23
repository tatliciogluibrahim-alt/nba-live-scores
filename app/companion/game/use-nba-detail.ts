"use client";

import { useEffect, useState } from "react";
import type { GamePlay } from "../../nba/types";

// Lightweight wrapper around /api/nba-game-detail. We only consume the
// fields the Live Companion uses — plays + broadcasts. The other API
// fields are deliberately not surfaced in the UI per the cut list in
// HANDOFF.md §10.

export type NBADetail = {
  plays: GamePlay[];
  broadcasts: string[];
};

const LIVE_INTERVAL_MS = 10_000;
const IDLE_INTERVAL_MS = 30_000;

type FullResponse = {
  broadcasts?: string[];
  plays?: GamePlay[];
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
    };
  } catch {
    return null;
  }
}

export function useNBADetail(eventId: string | null, isLive: boolean) {
  const [detail, setDetail] = useState<NBADetail | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
    }

    load();

    // Poll only while live. Final games are stable.
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isLive) {
      interval = setInterval(load, LIVE_INTERVAL_MS);
    } else {
      // Single refresh after a longer beat for upcoming games (status flips).
      interval = setInterval(load, IDLE_INTERVAL_MS);
    }

    return () => {
      mounted.current = false;
      if (interval) clearInterval(interval);
    };
  }, [eventId, isLive]);

  return { detail, hydrated };
}

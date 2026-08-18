"use client";

import { useEffect, useState } from "react";
import type {
  NFLLeaderLite,
  NFLScoringPlayLite,
} from "../../api/nfl-game-detail/normalize";

// Wrapper around /api/nfl-game-detail — the NFL sibling of use-nba-detail.
//
// Upcoming games are skipped entirely: ESPN's summary carries no scoring
// plays, no leaders, and no linescores before kickoff, so a fetch would buy
// an empty payload and a spinner. Live games poll; finals fetch once (the
// interval still runs, so a game that flips live→final settles on its own).

export type NFLDetail = {
  scoringPlays: NFLScoringPlayLite[];
  leaders: NFLLeaderLite[];
  periodScores: { away: number[]; home: number[] };
};

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

async function fetchDetail(eventId: string): Promise<NFLDetail | null> {
  try {
    const res = await fetch(
      `/api/nfl-game-detail?event=${encodeURIComponent(eventId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<NFLDetail>;
    return {
      scoringPlays: json.scoringPlays ?? [],
      leaders: json.leaders ?? [],
      periodScores: json.periodScores ?? { away: [], home: [] },
    };
  } catch {
    return null;
  }
}

export function useNFLDetail(
  eventId: string | null,
  status: "live" | "upcoming" | "final"
) {
  const [detail, setDetail] = useState<NFLDetail | null>(null);

  useEffect(() => {
    if (!eventId || status === "upcoming") return;
    const mounted = { current: true };

    async function load() {
      const next = await fetchDetail(eventId as string);
      if (!mounted.current || next === null) return;
      setDetail(next);
    }

    if (pageIsVisible()) load();

    const intervalMs = status === "live" ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    const interval = setInterval(() => {
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
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [eventId, status]);

  return detail;
}

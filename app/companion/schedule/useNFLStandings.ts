"use client";

import { useState } from "react";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import type { NFLStandings } from "../../api/nfl-standings/normalize";

// Reads /api/nfl-standings for Schedule's Standings tab. Records only move
// when games end and the route caches for ten minutes, so a slow refresh
// while the tab is visible is plenty.

const REFRESH_MS = 5 * 60_000;

export type NFLStandingsState =
  | { status: "loading" }
  | { status: "ready"; standings: NFLStandings }
  | { status: "unavailable" };

async function fetchStandings(): Promise<NFLStandings | null> {
  try {
    const res = await fetch("/api/nfl-standings", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<NFLStandings>;
    if (
      !Array.isArray(json.conferences) ||
      json.conferences.length === 0 ||
      typeof json.season !== "number" ||
      typeof json.seasonType !== "number"
    ) {
      return null;
    }
    return {
      season: json.season,
      seasonType: json.seasonType,
      conferences: json.conferences,
    };
  } catch {
    return null;
  }
}

export function useNFLStandings(): NFLStandingsState {
  const [state, setState] = useState<NFLStandingsState>({ status: "loading" });

  useVisibilityPoll(
    async (isCancelled) => {
      const standings = await fetchStandings();
      if (isCancelled()) return;
      // A failed refresh keeps a table already on screen; only a first load
      // with nothing to show reads as unavailable.
      setState((prev) =>
        standings
          ? { status: "ready", standings }
          : prev.status === "ready"
            ? prev
            : { status: "unavailable" }
      );
    },
    () => REFRESH_MS
  );

  return state;
}

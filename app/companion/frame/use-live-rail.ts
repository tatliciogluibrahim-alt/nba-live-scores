"use client";

import { useEffect, useRef, useState } from "react";
import { useFollows, usePinned } from "../providers";
import { getTournament } from "../following/data/tournaments";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import type { NBAGame, WCGameLite } from "../today/today-data";
import type { Follow } from "../state/types";

// Hook for the desktop sidebar's "Live now" rail. Returns every live game
// the user FOLLOWS (team / country / series / tournament) or has pinned, in a
// minimal pip shape. Pinned games sort first.
//
// Previously this was pinned-only (use-live-pinned), so the rail — the most
// valuable always-on desktop chrome — was empty for the majority who follow
// teams/countries but never pin. Now it mirrors the Today scoreboard's
// coverage so the rail and Today agree on "what of mine is live."
//
// Polls only while at least one matching game is live, on a relaxed cadence
// (ambient chrome, not the focused Watching surface). Bails entirely when the
// user has no follows and no pins, so a fresh user never triggers the fetch.

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;
const MAX_PIPS = 5;

export type LiveRailPip = {
  id: string;
  awayCode: string;
  homeCode: string;
  sport: "nba" | "wc";
  pinned: boolean;
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
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: WCGameLite[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

// Coverage predicate from follows + pins. Mirrors buildScoreboard: a game is
// "mine" if pinned, in a followed tournament's sport, or one of its codes is
// a followed team/country (or a leg of a followed series).
function buildCoverage(follows: Follow[], pinnedIds: Set<string>) {
  const codes = new Set<string>();
  let wcTour = false;
  let nbaTour = false;
  for (const f of follows) {
    if (f.kind === "team" || f.kind === "country") codes.add(f.id.toUpperCase());
    else if (f.kind === "series")
      f.id.split("-").forEach((c) => codes.add(c.toUpperCase()));
    else if (f.kind === "tournament") {
      if (getTournament(f.id)?.accent === "var(--wc)") wcTour = true;
      else nbaTour = true;
    }
  }
  return (away: string, home: string, sport: "nba" | "wc", id: string) =>
    pinnedIds.has(id) ||
    (sport === "wc" ? wcTour : nbaTour) ||
    codes.has(away.toUpperCase()) ||
    codes.has(home.toUpperCase());
}

export function useLiveRail(): LiveRailPip[] {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { pinned, hydrated: pinnedHydrated } = usePinned();
  const [pips, setPips] = useState<LiveRailPip[]>([]);

  // Stable refs the poll closure reads without re-subscribing each change.
  const followsRef = useRef(follows);
  const pinnedIdsRef = useRef<Set<string>>(new Set());
  const hasLiveRef = useRef(false);
  useEffect(() => {
    followsRef.current = follows;
  }, [follows]);
  useEffect(() => {
    pinnedIdsRef.current = new Set(pinned.map((p) => p.gameId));
  }, [pinned]);

  const hydrated = followsHydrated && pinnedHydrated;
  const active = hydrated && (follows.length > 0 || pinned.length > 0);

  // Clear stale pips when the user has nothing followed or pinned (the poll
  // is disabled then, so it won't clear them itself).
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPips([]);
    }
  }, [active]);

  useVisibilityPoll(
    async (isCancelled) => {
      const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
      if (isCancelled()) return;
      const pinnedIds = pinnedIdsRef.current;
      const covered = buildCoverage(followsRef.current, pinnedIds);
      const next: LiveRailPip[] = [];
      for (const g of nba) {
        if (g.status !== "live") continue;
        if (!covered(g.away.abbreviation, g.home.abbreviation, "nba", g.id)) continue;
        next.push({
          id: g.id,
          awayCode: g.away.abbreviation,
          homeCode: g.home.abbreviation,
          sport: "nba",
          pinned: pinnedIds.has(g.id),
        });
      }
      for (const g of wc) {
        if (g.status !== "live") continue;
        if (!covered(g.away.abbreviation, g.home.abbreviation, "wc", g.id)) continue;
        next.push({
          id: g.id,
          awayCode: g.away.abbreviation,
          homeCode: g.home.abbreviation,
          sport: "wc",
          pinned: pinnedIds.has(g.id),
        });
      }
      // Pinned first (the explicit "I'm tracking this"), then the rest.
      next.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
      hasLiveRef.current = next.length > 0;
      setPips(next.slice(0, MAX_PIPS));
    },
    () => (hasLiveRef.current ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS),
    active
  );

  return pips;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import type { NBAGame, WCGameLite } from "../today/today-data";

// Lightweight hook for the desktop sidebar's "Live now" pips. Returns
// the subset of the user's pinned games that are currently live, in a
// minimal shape (id + the two team/country codes). Distinct from
// use-watching-data — that builds the full Watching payload (snapshots,
// stale-pin resolution, sort). Here we only need "which pinned games
// are live right now" for a row of tappable pips, so we keep the fetch
// and the derivation deliberately small.
//
// Polls only while at least one pinned game is live, on a relaxed
// cadence (the sidebar is ambient chrome, not the focused Watching
// surface). Bails entirely when nothing is pinned so non-pinning users
// never trigger the fetch.

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;

export type LivePinnedPip = {
  id: string;
  awayCode: string;
  homeCode: string;
};

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

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

export function useLivePinned(): LivePinnedPip[] {
  const { pinned, hydrated } = usePinned();
  const [pips, setPips] = useState<LivePinnedPip[]>([]);
  const pinnedIdsRef = useRef<Set<string>>(new Set());
  const hasLiveRef = useRef(false);

  // Keep a stable ref of the pinned id set so the polling closure reads
  // fresh pins without re-running the effect each pin change.
  useEffect(() => {
    pinnedIdsRef.current = new Set(pinned.map((p) => p.gameId));
  }, [pinned]);

  useEffect(() => {
    if (!hydrated) return;
    if (pinned.length === 0) {
      // Clear any stale pips when the user unpins their last game.
      // This is a synchronize-with-external-state reset (pinned list
      // is the external source), not a derived-render loop — the
      // effect only re-runs when pinned.length crosses 0, so there's
      // no cascade. Safe to set directly here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPips([]);
      return;
    }
    const mounted = { current: true };

    async function load() {
      const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
      if (!mounted.current) return;
      const ids = pinnedIdsRef.current;
      const next: LivePinnedPip[] = [];
      for (const g of nba) {
        if (g.status === "live" && ids.has(g.id)) {
          next.push({
            id: g.id,
            awayCode: g.away.abbreviation,
            homeCode: g.home.abbreviation,
          });
        }
      }
      for (const g of wc) {
        if (g.status === "live" && ids.has(g.id)) {
          next.push({
            id: g.id,
            awayCode: g.away.abbreviation,
            homeCode: g.home.abbreviation,
          });
        }
      }
      hasLiveRef.current = next.length > 0;
      setPips(next);
    }

    if (pageIsVisible()) load();

    let timeout: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timeout);
      const ms = hasLiveRef.current ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
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
    // pinned.length gates the effect (re-run when going from 0↔N pins);
    // individual pin id changes are read via pinnedIdsRef inside load().
  }, [hydrated, pinned.length]);

  return pips;
}

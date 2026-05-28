"use client";

import { useEffect, useRef, useState } from "react";
import { usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
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

  // Clear stale pips when the user unpins their last game. The poll is
  // disabled at zero pins (see `enabled` below), so it won't clear them
  // itself. Synchronize-with-external-state reset, not a render loop.
  useEffect(() => {
    if (pinned.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPips([]);
    }
  }, [pinned.length]);

  // Shared poll plumbing. Enabled only once hydrated AND something is
  // pinned, so non-pinning users never trigger the fetch. Cadence reads
  // hasLiveRef so it tightens to 15s while a pinned game is live.
  useVisibilityPoll(
    async (isCancelled) => {
      const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
      if (isCancelled()) return;
      const ids = pinnedIdsRef.current;
      const next: LivePinnedPip[] = [];
      for (const g of nba) {
        if (g.status === "live" && ids.has(g.id)) {
          next.push({ id: g.id, awayCode: g.away.abbreviation, homeCode: g.home.abbreviation });
        }
      }
      for (const g of wc) {
        if (g.status === "live" && ids.has(g.id)) {
          next.push({ id: g.id, awayCode: g.away.abbreviation, homeCode: g.home.abbreviation });
        }
      }
      hasLiveRef.current = next.length > 0;
      setPips(next);
    },
    () => (hasLiveRef.current ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS),
    hydrated && pinned.length > 0
  );

  return pips;
}

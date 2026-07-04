"use client";

import { useEffect, useState } from "react";
import type { WCLineups } from "../../lib/wc-lineups";

// Client hook for the Starting XI section (spec §17). Fetches /api/wc-lineups
// once on mount, then — while the announcement window is open — repolls every
// 60s until the XI lands.
//
// Return contract mirrors the route:
//   null            → nothing to show (not fetched yet, or hard failure) → render nothing
//   { pending }     → announced-but-not-yet (pre-match) → render the pending state
//   { teams }       → announced → render the grid
//
// Follows the fetch/mounted idiom of useNBADetail.

const LIVE_POLL_MS = 90_000;
const POLL_MS = 60_000;
// Only repoll inside the announcement window: XIs land ~1h before kickoff, so
// we start polling once kickoff is within ~2h and stop the moment they arrive.
const KICKOFF_WINDOW_MS = 2 * 60 * 60 * 1000;

// Real ESPN fifa.world event ids are all-digits (verified live). Preview/mock
// games carry synthetic ids ("wc-mock-live", "preview-wc-usa-tur") that have no
// ESPN summary — skipping the fetch for them keeps the section calm (renders
// nothing) with zero failed requests.
function isRealEventId(id: string): boolean {
  return /^\d+$/.test(id);
}

function pageIsVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

async function fetchLineups(eventId: string): Promise<WCLineups | null> {
  try {
    const res = await fetch(
      `/api/wc-lineups?event=${encodeURIComponent(eventId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<WCLineups> & { error?: string };
    if (Array.isArray((json as { teams?: unknown }).teams)) {
      return { teams: (json as WCLineups & { teams: [] }).teams };
    }
    if ((json as { pending?: boolean }).pending === true) return { pending: true };
    return null; // error envelope or anything unexpected → render nothing
  } catch {
    return null;
  }
}

export function useWCLineups(
  eventId: string | null,
  status: "live" | "upcoming" | "final",
  kickoff: string
): WCLineups | null {
  const [lineups, setLineups] = useState<WCLineups | null>(null);

  useEffect(() => {
    if (!eventId || !isRealEventId(eventId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLineups(null);
      return;
    }

    const mounted = { current: true };
    let interval: ReturnType<typeof setInterval> | null = null;

    async function load() {
      const next = await fetchLineups(eventId as string);
      if (!mounted.current) return;
      setLineups(next);
      // Pre-kickoff tier only: announced → stop polling. The live tier
      // keeps its interval (subs keep landing until full time).
      if (status === "upcoming" && next && "teams" in next && interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    if (pageIsVisible()) load();

    // Pre-kickoff tier: repoll only while the announcement is pending and
    // kickoff is within the window. Live tier (D4 6c): repoll every 90s so
    // substitutions land mid-match; stops when the effect re-runs at final.
    const kickoffMs = new Date(kickoff).getTime();
    const withinWindow =
      Number.isFinite(kickoffMs) && kickoffMs - Date.now() <= KICKOFF_WINDOW_MS;
    if (status === "upcoming" && withinWindow) {
      interval = setInterval(() => {
        if (pageIsVisible()) load();
      }, POLL_MS);
    } else if (status === "live") {
      interval = setInterval(() => {
        if (pageIsVisible()) load();
      }, LIVE_POLL_MS);
    }

    return () => {
      mounted.current = false;
      if (interval) clearInterval(interval);
    };
  }, [eventId, status, kickoff]);

  return lineups;
}

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

  // Initial fetch — one shot when the game identity changes. Repeats are
  // driven by the polling effect below, so this never sets up an interval.
  useEffect(() => {
    if (!eventId || !isRealEventId(eventId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLineups(null);
      return;
    }
    const mounted = { current: true };
    async function load() {
      const next = await fetchLineups(eventId as string);
      if (mounted.current) setLineups(next);
    }
    if (pageIsVisible()) load();
    return () => {
      mounted.current = false;
    };
  }, [eventId, status, kickoff]);

  // The pre-kickoff poll exists only to catch the XI landing. Gate it on the
  // result actually being pending: an already-announced XI should never spin
  // up a throwaway interval that fires one poll and self-terminates.
  const isPending =
    lineups !== null && "pending" in lineups && lineups.pending === true;

  // Polling. Live (D4 6c): repoll every 90s so substitutions land mid-match.
  // Pre-kickoff: repoll every 60s ONLY while the announcement is still pending
  // and kickoff is within the window; stops the moment teams arrive (isPending
  // flips false → this effect re-runs and tears the interval down).
  useEffect(() => {
    if (!eventId || !isRealEventId(eventId)) return;

    const kickoffMs = new Date(kickoff).getTime();
    const withinWindow =
      Number.isFinite(kickoffMs) && kickoffMs - Date.now() <= KICKOFF_WINDOW_MS;

    let intervalMs: number | null = null;
    if (status === "live") intervalMs = LIVE_POLL_MS;
    else if (status === "upcoming" && withinWindow && isPending)
      intervalMs = POLL_MS;
    if (intervalMs === null) return;

    const mounted = { current: true };
    const interval = setInterval(() => {
      if (!pageIsVisible()) return;
      void (async () => {
        const next = await fetchLineups(eventId as string);
        if (mounted.current) setLineups(next);
      })();
    }, intervalMs);

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [eventId, status, kickoff, isPending]);

  return lineups;
}

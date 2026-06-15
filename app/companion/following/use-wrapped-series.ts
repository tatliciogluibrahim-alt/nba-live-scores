"use client";

import { useEffect, useState } from "react";
import { buildSeriesKey } from "../../nba/lib/series-keys";

// Detect which playoff series have wrapped. A series is "wrapped" when
// any final game in the last few weeks carries a "WINS SERIES" marker
// in its seriesSummary — that's ESPN's signal that the series ended.
//
// Used by FollowingDashboard to flag series follows whose underlying
// series is over (e.g. NYK · CLE after NYK closed out 4–0). Visually
// that follow becomes inert — no future games will fire alerts — so
// we surface a calm "Wrapped" chip on the FollowCard rather than
// having the user wonder why nothing's happening.
//
// Tournament-wrapped (the NBA playoffs as a whole) rides the same fetch:
// when the wrapped series IS the NBA Finals, the whole playoffs are over,
// so we add a "nba-playoffs-wrapped" marker to the same Set. We key off
// the championship — not "no upcoming games" — so the playoffs are never
// falsely marked wrapped between rounds (a gap where the next round just
// isn't scheduled in the feed window yet). FollowingDashboard reads the
// marker to move a wrapped NBA-playoffs tournament follow out of
// "Coming up" and into "Season over".
//
// Detection is best-effort: one fetch on mount, cached for the session.
// If the API fails we return an empty set, the chip simply doesn't
// render, and nothing is broken.

/** Marker added to the wrapped Set when the NBA Finals are decided. */
export const NBA_PLAYOFFS_WRAPPED = "nba-playoffs-wrapped";

type ApiGame = {
  status: "live" | "upcoming" | "final";
  seriesSummary?: string;
  seriesRound?: string;
  away: { abbreviation: string };
  home: { abbreviation: string };
};

export function useWrappedSeries(): Set<string> {
  const [wrappedIds, setWrappedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/live-scores", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          games?: ApiGame[];
          seriesGames?: ApiGame[];
        };
        // Prefer seriesGames (wider window, ~14 days back) so a series
        // that wrapped a few days ago still registers.
        const source = json.seriesGames ?? json.games ?? [];
        const wrapped = new Set<string>();
        for (const g of source) {
          if (g.status !== "final") continue;
          if (!/WINS\s+SERIES/i.test(g.seriesSummary ?? "")) continue;
          if (!g.away?.abbreviation || !g.home?.abbreviation) continue;
          wrapped.add(
            buildSeriesKey(g.away.abbreviation, g.home.abbreviation)
          );
          // If the wrapped series is the NBA Finals, the playoffs are
          // over. "NBA Finals" matches; "Semifinals" / "Conference
          // Finals" deliberately don't (they'd mark the tournament
          // wrapped mid-playoffs).
          if (/nba\s*finals/i.test(g.seriesRound ?? "")) {
            wrapped.add(NBA_PLAYOFFS_WRAPPED);
          }
        }
        if (!cancelled) setWrappedIds(wrapped);
      } catch {
        // Best-effort. No-op on failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return wrappedIds;
}

"use client";

import { useEffect, useState } from "react";
import { buildSeriesKey } from "../../nba/lib/series-keys";
import { wcFeedUrl } from "../dev/preview-mode";

// Detect which follows have a live game right now. Returns a Set of
// follow identifiers (team abbreviation, country code, or series key)
// that match at least one in-progress game.
//
// Used by FollowingDashboard to render a calm pulsing dot on the
// FollowCard — the user knows immediately which of their follows is
// playing without leaving the Following tab.
//
// Detection is best-effort: one fetch on mount, cached for the session.
// If either API fails we return an empty set and the dot simply doesn't
// render. No functional impact.

type ApiGame = {
  status: "live" | "upcoming" | "final";
  away: { abbreviation: string };
  home: { abbreviation: string };
};

type WCGame = {
  status: "live" | "upcoming" | "final";
  away: { abbreviation: string };
  home: { abbreviation: string };
};

type ParticipantFollowKind = "team" | "country" | "series";

export function liveFollowKey(
  kind: ParticipantFollowKind,
  id: string
): string {
  return `${kind}:${id.trim().toUpperCase()}`;
}

export function useLiveFollows(): Set<string> {
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nbaRes, wcRes] = await Promise.all([
          fetch("/api/live-scores", { cache: "no-store" }).catch(() => null),
          fetch(wcFeedUrl(), { cache: "no-store" }).catch(() => null),
        ]);

        const nbaJson = nbaRes?.ok
          ? ((await nbaRes.json()) as { games?: ApiGame[] })
          : { games: [] };
        const wcJson = wcRes?.ok
          ? ((await wcRes.json()) as { games?: WCGame[] })
          : { games: [] };

        const ids = new Set<string>();

        // NBA live games → team abbreviations + series key
        for (const g of nbaJson.games ?? []) {
          if (g.status !== "live") continue;
          if (g.away?.abbreviation) {
            ids.add(liveFollowKey("team", g.away.abbreviation));
          }
          if (g.home?.abbreviation) {
            ids.add(liveFollowKey("team", g.home.abbreviation));
          }
          if (g.away?.abbreviation && g.home?.abbreviation) {
            ids.add(
              liveFollowKey(
                "series",
                buildSeriesKey(g.away.abbreviation, g.home.abbreviation)
              )
            );
          }
        }

        // WC live games → country codes
        for (const g of wcJson.games ?? []) {
          if (g.status !== "live") continue;
          if (g.away?.abbreviation) {
            ids.add(liveFollowKey("country", g.away.abbreviation));
          }
          if (g.home?.abbreviation) {
            ids.add(liveFollowKey("country", g.home.abbreviation));
          }
        }

        // Tournament follows: if ANY live game exists, the tournament is live
        if (ids.size > 0) {
          // Mark tournament IDs as live. We use prefixes that match the
          // dispatcher's tournament-follow convention.
          const hasNBALive = (nbaJson.games ?? []).some(
            (g) => g.status === "live"
          );
          const hasWCLive = (wcJson.games ?? []).some(
            (g) => g.status === "live"
          );
          if (hasNBALive) ids.add("nba-playoffs-live");
          if (hasWCLive) ids.add("wc-live");
        }

        if (!cancelled) setLiveIds(ids);
      } catch {
        // Best-effort. No-op on failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return liveIds;
}

/** Check if a follow has a live game. Handles each follow kind:
 *  - team: abbreviation is in the live set
 *  - country: country code is in the live set
 *  - series: series key (sorted "AWAY-HOME") is in the live set
 *  - tournament: special "nba-playoffs-live" / "wc-live" markers */
export function isFollowLive(
  kind: string,
  id: string,
  liveIds: Set<string>
): boolean {
  if (kind === "team" || kind === "country" || kind === "series") {
    return liveIds.has(liveFollowKey(kind, id));
  }
  if (kind === "tournament") {
    if (id.startsWith("nba-playoffs")) return liveIds.has("nba-playoffs-live");
    if (id.startsWith("fifa-world-cup")) return liveIds.has("wc-live");
  }
  return false;
}

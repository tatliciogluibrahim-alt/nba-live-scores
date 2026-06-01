// Reminders cron helpers, extracted to a sibling file so they can be
// unit-tested. Next.js route files (route.ts) only allow a fixed set of
// exports (GET/POST/runtime/etc), so the pure helpers live here.

import { buildSeriesKey } from "../../../nba/lib/series-keys";
import type { SyncedAlert } from "../../../lib/push/sync-validation";

/** Minimum game shape the reminders matcher cares about. Mirrors the
 *  intersection of NBAGame / WCGameLite the route's `fetchGames` returns. */
export type FeedGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  away?: { abbreviation?: string };
  home?: { abbreviation?: string };
};

/** A game's matchable follow ids: both team/country codes plus the NBA
 *  series key. Country follows match the code; series follows match the
 *  key. */
export function gameMatchIds(game: FeedGame): Set<string> {
  const ids = new Set<string>();
  const a = game.away?.abbreviation;
  const h = game.home?.abbreviation;
  if (a) ids.add(a.toUpperCase());
  if (h) ids.add(h.toUpperCase());
  if (a && h) ids.add(buildSeriesKey(a, h));
  return ids;
}

/** The subscriber's alert ids that can trigger a reminder (team /
 *  country / series — tournament excluded to avoid per-game spam). */
export function reminderFollowIds(alerts: SyncedAlert[]): Set<string> {
  const ids = new Set<string>();
  for (const a of alerts) {
    if (a.kind === "team" || a.kind === "country" || a.kind === "series") {
      ids.add(a.id.toUpperCase());
    }
  }
  return ids;
}

/** Set intersection — true when any element of `a` is in `b`. */
export function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

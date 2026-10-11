import { TOURNAMENTS } from "../following/data/tournaments";
import type { ScoreboardTile, TodaySource } from "./today-data";

// Where Today's live links go (persona sweep, 2026-10-11). Pure, so each
// target is tested: "1 LIVE →" opened an empty Watching, "+2 MORE LIVE"
// opened Watching instead of the games it counted, and a visitor with no
// follows read "Nothing demanding your attention" while eight games were on.

const ACCENT: Record<TodaySource, string> = {
  nba: "var(--nba)",
  wc: "var(--wc)",
  nfl: "var(--nfl)",
};

/** Schedule, opened on the competition that holds these live games (the
 *  live week, grouped by broadcast window for the NFL). A mixed or empty
 *  set opens Schedule across all sports. */
export function scheduleLiveHref(sources: readonly TodaySource[]): string {
  const unique = Array.from(new Set(sources));
  if (unique.length === 1) {
    const id = TOURNAMENTS.find((t) => t.accent === ACCENT[unique[0]])?.id;
    if (id) return `/schedule?scope=all&competition=${id}`;
  }
  return "/schedule?scope=all";
}

export type LiveTarget = { href: string; label: string };

/** The masthead's "N LIVE →" target. One live game opens that game. Several
 *  open Watching only when Watching holds every one of them (all tracked),
 *  otherwise Schedule, which lists them all. Null when nothing is live. */
export function mastheadLiveTarget(
  tiles: readonly ScoreboardTile[]
): LiveTarget | null {
  const live = tiles.filter((t) => t.status === "live");
  if (live.length === 0) return null;
  if (live.length === 1) {
    const t = live[0];
    return { href: t.href, label: `Open ${t.awayCode} at ${t.homeCode}` };
  }
  if (live.every((t) => t.tracked === true)) {
    return { href: "/watching", label: "Open Watching" };
  }
  return {
    href: scheduleLiveHref(live.map((t) => t.source)),
    label: "Open Schedule",
  };
}

export type FeedLiveCounts = { nba: number; wc: number; nfl: number };

/** One calm line for a Today with no follows while games are on, with the
 *  real count ("8 NFL games are live."). Null when nothing is live, so the
 *  calm empty state keeps its place. */
export function liveElsewhereLine(
  counts: FeedLiveCounts | undefined
): { text: string; href: string } | null {
  if (!counts) return null;
  const entries = (Object.entries(counts) as [TodaySource, number][]).filter(
    ([, n]) => n > 0
  );
  if (entries.length === 0) return null;
  if (entries.length === 1) {
    const [source, n] = entries[0];
    const noun =
      source === "wc"
        ? n === 1
          ? "Summer Soccer match is"
          : "Summer Soccer matches are"
        : `${source.toUpperCase()} ${n === 1 ? "game is" : "games are"}`;
    return { text: `${n} ${noun} live.`, href: scheduleLiveHref([source]) };
  }
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return { text: `${total} games are live.`, href: scheduleLiveHref([]) };
}

"use client";

import { useState } from "react";
import { buildSeriesKey } from "../../nba/lib/series-keys";
import { wcFeedUrl } from "../dev/preview-mode";
import { readFeed, FEED_KEYS } from "../hooks/feed-cache";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { momentSport } from "../state/moments";
import type { Follow, Sport } from "../state/types";

// Which follows have a live game right now. Drives the LIVE NOW section and
// the breathing "Live" tag on Following's rows.
//
// Persona sweep 2026-10-11: this read only the NBA and Summer Soccer feeds,
// so a Steelers follow sat under UP NEXT while the Steelers were playing.
// NFL is read now, and every key is sport-scoped (Path B): "nfl:team:CLE"
// (Browns) and "nba:team:CLE" (Cavaliers) can never light each other.
//
// Best-effort: a failed feed reads as "nothing live" for that sport, never
// as an error. Seeded from the shared feed cache (the slate Today or
// Watching just fetched) so a tab switch paints the right section at once,
// then refreshed on a slow, visibility-aware poll.

const POLL_MS = 60_000;

/** The slice of a scoreboard game this needs. NBA games also carry their
 *  playoff context. */
export type LiveFeedGame = {
  status: string;
  away?: { abbreviation?: string };
  home?: { abbreviation?: string };
  /** NBA: "" outside a playoff series. */
  seriesRound?: string;
  /** NBA: names the Play-In, which has no series round. */
  gameContext?: string;
};

type LiveKind = "team" | "country" | "series" | "tournament";

function liveKey(sport: Sport, kind: LiveKind, id = ""): string {
  return `${sport}:${kind}:${id.trim().toUpperCase()}`;
}

/** NBA follows are NBA Playoffs follows. ESPN's NBA feed also carries
 *  preseason and regular-season games, which must not light them (the same
 *  rule the Brief adopted 2026-10-03). */
function isNBAPlayoffGame(g: LiveFeedGame): boolean {
  return (g.seriesRound ?? "") !== "" || /play-?in/i.test(g.gameContext ?? "");
}

/** Pure: the set of live keys across the three feeds. */
export function buildLiveFollowKeys(feeds: {
  nba?: readonly LiveFeedGame[];
  wc?: readonly LiveFeedGame[];
  nfl?: readonly LiveFeedGame[];
}): Set<string> {
  const ids = new Set<string>();

  for (const g of feeds.nba ?? []) {
    if (g.status !== "live" || !isNBAPlayoffGame(g)) continue;
    const away = g.away?.abbreviation;
    const home = g.home?.abbreviation;
    if (away) ids.add(liveKey("nba", "team", away));
    if (home) ids.add(liveKey("nba", "team", home));
    if (away && home) {
      ids.add(
        liveKey("nba", "series", buildSeriesKey(away.toUpperCase(), home.toUpperCase()))
      );
    }
    ids.add(liveKey("nba", "tournament"));
  }

  for (const g of feeds.wc ?? []) {
    if (g.status !== "live") continue;
    if (g.away?.abbreviation) ids.add(liveKey("wc", "country", g.away.abbreviation));
    if (g.home?.abbreviation) ids.add(liveKey("wc", "country", g.home.abbreviation));
    ids.add(liveKey("wc", "tournament"));
  }

  for (const g of feeds.nfl ?? []) {
    if (g.status !== "live") continue;
    if (g.away?.abbreviation) ids.add(liveKey("nfl", "team", g.away.abbreviation));
    if (g.home?.abbreviation) ids.add(liveKey("nfl", "team", g.home.abbreviation));
    ids.add(liveKey("nfl", "tournament"));
  }

  return ids;
}

/** Does this follow have a live game? The follow's MOMENT decides the
 *  sport. A whole-competition follow is live while any of its games is. */
export function isFollowLive(
  follow: Pick<Follow, "momentId" | "kind" | "id" | "scopeId">,
  live: ReadonlySet<string>
): boolean {
  const sport = momentSport(follow.momentId);
  if (!sport) return false;
  if (follow.kind === "tournament") return live.has(liveKey(sport, "tournament"));
  return live.has(liveKey(sport, follow.kind, follow.scopeId ?? follow.id));
}

function followedSports(follows: readonly Pick<Follow, "momentId">[]): Sport[] {
  const out = new Set<Sport>();
  for (const f of follows) {
    const sport = momentSport(f.momentId);
    if (sport) out.add(sport);
  }
  return Array.from(out).sort();
}

function seedFromFeedCache(sports: readonly Sport[]): Set<string> {
  return buildLiveFollowKeys({
    nba: sports.includes("nba")
      ? readFeed<{ games?: LiveFeedGame[] }>(FEED_KEYS.liveScores)?.games
      : undefined,
    wc: sports.includes("wc") ? readFeed<LiveFeedGame[]>(FEED_KEYS.worldCup) : undefined,
    nfl: sports.includes("nfl") ? readFeed<LiveFeedGame[]>(FEED_KEYS.nfl) : undefined,
  });
}

async function fetchGames(url: string): Promise<LiveFeedGame[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: LiveFeedGame[] };
    return Array.isArray(json.games) ? json.games : [];
  } catch {
    return [];
  }
}

/** Live keys for the sports these follows cover (only those feeds are
 *  read). Pass the result to isFollowLive. */
export function useLiveFollows(
  follows: readonly Pick<Follow, "momentId">[]
): Set<string> {
  const sports = followedSports(follows);
  const [liveIds, setLiveIds] = useState<Set<string>>(() =>
    seedFromFeedCache(sports)
  );

  useVisibilityPoll(
    async (isCancelled) => {
      const [nba, wc, nfl] = await Promise.all([
        sports.includes("nba") ? fetchGames("/api/live-scores") : [],
        sports.includes("wc") ? fetchGames(wcFeedUrl()) : [],
        sports.includes("nfl") ? fetchGames("/api/nfl-scores") : [],
      ]);
      if (isCancelled()) return;
      setLiveIds(buildLiveFollowKeys({ nba, wc, nfl }));
    },
    () => POLL_MS
  );

  return liveIds;
}

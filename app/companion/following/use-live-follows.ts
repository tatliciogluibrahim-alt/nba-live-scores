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
  /** ESPN event id. Following's live links open the game by it. */
  id?: string;
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

type LiveFeeds = {
  nba?: readonly LiveFeedGame[];
  wc?: readonly LiveFeedGame[];
  nfl?: readonly LiveFeedGame[];
};

/** The live keys one game lights, or none when it isn't live (or is an
 *  NBA game outside the playoffs). */
function gameLiveKeys(sport: Sport, g: LiveFeedGame): string[] {
  if (g.status !== "live") return [];
  if (sport === "nba" && !isNBAPlayoffGame(g)) return [];
  const away = g.away?.abbreviation;
  const home = g.home?.abbreviation;
  const kind: LiveKind = sport === "wc" ? "country" : "team";
  const keys: string[] = [];
  if (away) keys.push(liveKey(sport, kind, away));
  if (home) keys.push(liveKey(sport, kind, home));
  if (sport === "nba" && away && home) {
    keys.push(liveKey("nba", "series", buildSeriesKey(away.toUpperCase(), home.toUpperCase())));
  }
  keys.push(liveKey(sport, "tournament"));
  return keys;
}

const SPORTS: Sport[] = ["nba", "wc", "nfl"];

/** Pure: the set of live keys across the three feeds. */
export function buildLiveFollowKeys(feeds: LiveFeeds): Set<string> {
  const ids = new Set<string>();
  for (const sport of SPORTS) {
    for (const g of feeds[sport] ?? []) {
      for (const k of gameLiveKeys(sport, g)) ids.add(k);
    }
  }
  return ids;
}

export type LiveFollowGame = {
  id: string;
  source: Sport;
  awayCode: string;
  homeCode: string;
};

/** Pure: the live games behind these follows, once each, in feed order.
 *  Following's live band and masthead count open them (2026-10-11): one
 *  game opens that game, several open Schedule, where they used to open an
 *  empty Watching. */
export function liveFollowGames(
  feeds: LiveFeeds,
  follows: readonly Pick<Follow, "momentId" | "kind" | "id" | "scopeId">[]
): LiveFollowGame[] {
  const out: LiveFollowGame[] = [];
  for (const sport of SPORTS) {
    for (const g of feeds[sport] ?? []) {
      if (!g.id) continue;
      const keys = new Set(gameLiveKeys(sport, g));
      if (keys.size === 0) continue;
      if (!follows.some((f) => isFollowLive(f, keys))) continue;
      out.push({
        id: g.id,
        source: sport,
        awayCode: g.away?.abbreviation ?? "",
        homeCode: g.home?.abbreviation ?? "",
      });
    }
  }
  return out;
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

export type LiveFollows = {
  /** Live keys. Pass to isFollowLive. */
  ids: Set<string>;
  /** The live games behind the follows (liveFollowGames). */
  games: LiveFollowGame[];
};

function liveFollowsFrom(
  feeds: LiveFeeds,
  follows: readonly Pick<Follow, "momentId" | "kind" | "id" | "scopeId">[]
): LiveFollows {
  return { ids: buildLiveFollowKeys(feeds), games: liveFollowGames(feeds, follows) };
}

function seedFromFeedCache(sports: readonly Sport[]): LiveFeeds {
  return {
    nba: sports.includes("nba")
      ? readFeed<{ games?: LiveFeedGame[] }>(FEED_KEYS.liveScores)?.games
      : undefined,
    wc: sports.includes("wc") ? readFeed<LiveFeedGame[]>(FEED_KEYS.worldCup) : undefined,
    nfl: sports.includes("nfl") ? readFeed<LiveFeedGame[]>(FEED_KEYS.nfl) : undefined,
  };
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

/** Live keys and live games for the sports these follows cover (only those
 *  feeds are read). Pass `ids` to isFollowLive. */
export function useLiveFollows(
  follows: readonly Pick<Follow, "momentId" | "kind" | "id" | "scopeId">[]
): LiveFollows {
  const sports = followedSports(follows);
  const [live, setLive] = useState<LiveFollows>(() =>
    liveFollowsFrom(seedFromFeedCache(sports), follows)
  );

  useVisibilityPoll(
    async (isCancelled) => {
      const [nba, wc, nfl] = await Promise.all([
        sports.includes("nba") ? fetchGames("/api/live-scores") : [],
        sports.includes("wc") ? fetchGames(wcFeedUrl()) : [],
        sports.includes("nfl") ? fetchGames("/api/nfl-scores") : [],
      ]);
      if (isCancelled()) return;
      setLive(liveFollowsFrom({ nba, wc, nfl }, follows));
    },
    () => POLL_MS
  );

  return live;
}

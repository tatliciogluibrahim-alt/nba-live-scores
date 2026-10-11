import { kv } from "@vercel/kv";
import { getNFLTeam } from "../../companion/following/data/nfl-teams";
import { getTeam } from "../../companion/following/data/teams";
import { getCountry } from "../../companion/following/data/countries";

// The game page's <title>. Every game page used to read "Game | No Noise
// Scores" (persona sweep 2026-10-11), so a tab or a history list of games
// was a column of identical words.
//
// Rules:
//   - NFL and NBA: "{Away} at {Home} | No Noise Scores".
//   - Summer Soccer: "{Away} vs {Home} | No Noise Scores", the order the
//     match page's own heading and score rows use.
//   - Never a score. Titles show in tabs, history and share sheets, so a
//     score there is a spoiler that No-Spoilers cannot reach. Only names
//     ever enter a Matchup.
//   - Cheap: names come from data the app already keeps in KV (the feed
//     caches and the push scanners' per-game state). No ESPN call. Unknown
//     means the old title, never a guess.

export const FALLBACK_GAME_TITLE = "Game | No Noise Scores";

export type Matchup = { sport: "nfl" | "nba" | "wc"; away: string; home: string };

const PLACEHOLDER = /^(tbd|tba|team)$/i;

function cleanName(name: string): string | null {
  const n = name.trim();
  return n && !PLACEHOLDER.test(n) ? n : null;
}

export function gameTitle(m: Matchup | null): string {
  if (!m) return FALLBACK_GAME_TITLE;
  const away = cleanName(m.away);
  const home = cleanName(m.home);
  if (!away || !home) return FALLBACK_GAME_TITLE;
  const joiner = m.sport === "wc" ? "vs" : "at";
  return `${away} ${joiner} ${home} | No Noise Scores`;
}

/** ESPN event ids are digits; preview ids are lowercase words and dashes. */
export function isGameId(id: string): boolean {
  return /^[A-Za-z0-9-]{1,40}$/.test(id);
}

// ── Cache shapes (only the fields read here) ────────────────────────────

type Side = { name?: unknown };
type FeedGame = { id?: unknown; away?: Side; home?: Side };
type CodeState = { awayCode?: unknown; homeCode?: unknown };

export type GameCaches = {
  /** /api/nfl-scores current week (`nns:nfl:scoreboard:v1:cur:cur`). */
  nflScoreboard?: { games?: FeedGame[] } | null;
  /** scan-nfl per-game state (`nns:nfl:game-state:v1:{id}`). */
  nflState?: CodeState | null;
  /** /api/live-scores (`nns:nba:live:v1`). */
  nbaLive?: {
    payload?: { games?: FeedGame[]; seriesGames?: FeedGame[] };
    fetchedAt?: number;
  } | null;
  /** Final NBA snapshot (`nns:game-snapshot:v1:{id}`). */
  nbaSnapshot?: FeedGame | null;
  /** scan-nba per-game state (`nns:nba:game-state:v1:{id}`). */
  nbaState?: CodeState | null;
  /** /api/world-cup (`nns:wc:live:v1`). */
  wcLive?: { games?: FeedGame[]; fetchedAt?: number } | null;
  /** scan-wc per-game state (`nns:wc:game-state:v1:{id}`). */
  wcState?: CodeState | null;
};

function fromFeed(
  sport: Matchup["sport"],
  id: string,
  games: readonly FeedGame[] | undefined
): Matchup | null {
  const g = (games ?? []).find((x) => x && x.id === id);
  if (!g) return null;
  const away = typeof g.away?.name === "string" ? g.away.name : "";
  const home = typeof g.home?.name === "string" ? g.home.name : "";
  return away && home ? { sport, away, home } : null;
}

function fromCodes(
  sport: Matchup["sport"],
  state: CodeState | null | undefined,
  nameOf: (code: string) => string | undefined
): Matchup | null {
  if (!state) return null;
  const a = typeof state.awayCode === "string" ? nameOf(state.awayCode) : undefined;
  const h = typeof state.homeCode === "string" ? nameOf(state.homeCode) : undefined;
  return a && h ? { sport, away: a, home: h } : null;
}

/** The matchup for a game id, from whichever cache knows it. Feed caches
 *  carry ESPN's names; per-game states carry codes, named from the app's
 *  own team directories (nicknames for NFL and NBA, as the app speaks). */
export function matchupFromCaches(id: string, c: GameCaches): Matchup | null {
  return (
    fromFeed("nfl", id, c.nflScoreboard?.games) ??
    fromCodes("nfl", c.nflState, (code) => getNFLTeam(code)?.name) ??
    fromFeed("nba", id, [
      ...(c.nbaLive?.payload?.games ?? []),
      ...(c.nbaLive?.payload?.seriesGames ?? []),
    ]) ??
    (c.nbaSnapshot ? fromFeed("nba", id, [c.nbaSnapshot]) : null) ??
    fromCodes("nba", c.nbaState, (code) => getTeam(code)?.name) ??
    fromFeed("wc", id, c.wcLive?.games) ??
    fromCodes("wc", c.wcState, (code) => getCountry(code)?.name)
  );
}

// ── KV read (server only) ───────────────────────────────────────────────
// Key strings mirror their owners (nfl-scores/route.ts, nfl-state-cache.ts,
// live-scores/route.ts, game-snapshot.ts, state-cache.ts, world-cup/route.ts,
// wc-state-cache.ts). If one moves, titles fall back; nothing breaks.

const KV_TIMEOUT_MS = 400;

function within<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("kv timeout")), ms)),
  ]);
}

export async function resolveGameTitle(id: string): Promise<string> {
  if (!isGameId(id)) return FALLBACK_GAME_TITLE;
  try {
    // Small entries first: the NFL week and the three per-game states.
    const [nflScoreboard, nflState, nbaState, wcState] = await within(
      kv.mget<
        [
          GameCaches["nflScoreboard"],
          GameCaches["nflState"],
          GameCaches["nbaState"],
          GameCaches["wcState"],
        ]
      >(
        "nns:nfl:scoreboard:v1:cur:cur",
        `nns:nfl:game-state:v1:${id}`,
        `nns:nba:game-state:v1:${id}`,
        `nns:wc:game-state:v1:${id}`
      ),
      KV_TIMEOUT_MS
    );
    const first = matchupFromCaches(id, { nflScoreboard, nflState, nbaState, wcState });
    if (first) return gameTitle(first);

    // Then the larger NBA and Summer Soccer payloads.
    const [nbaSnapshot, nbaLive, wcLive] = await within(
      kv.mget<
        [GameCaches["nbaSnapshot"], GameCaches["nbaLive"], GameCaches["wcLive"]]
      >(`nns:game-snapshot:v1:${id}`, "nns:nba:live:v1", "nns:wc:live:v1"),
      KV_TIMEOUT_MS
    );
    return gameTitle(matchupFromCaches(id, { nbaSnapshot, nbaLive, wcLive }));
  } catch {
    // KV absent (local dev), slow, or down: the plain title.
    return FALLBACK_GAME_TITLE;
  }
}

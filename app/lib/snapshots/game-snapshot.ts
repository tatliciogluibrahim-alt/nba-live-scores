// Final game snapshots — KV-backed.
//
// Problem: ESPN's scoreboard endpoint (`/api/live-scores`) only returns
// "current" games (live, upcoming today, recently finished). A few hours
// after a game ends, it drops off the feed. /game/[id] then can't
// resolve it and the user gets a "not in the live feed" dead end.
//
// Fix: every time the cron sees a `final` game, snapshot it to KV. The
// game detail route falls back to the snapshot when the live feed is
// empty. Snapshots live 60 days — long enough to cover playoffs / WC
// historic browsing without bloating KV with regular-season noise.

import { kv } from "@vercel/kv";
import type { Game } from "../../nba/types";

const KEY_PREFIX = "nns:game-snapshot:v1:";
const TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days

function snapshotKey(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`;
}

/** Persist a final game state to KV. Idempotent — calling twice
 *  overwrites the previous snapshot (useful when ESPN backfills box
 *  scores hours after the game ends). */
export async function saveGameSnapshot(game: Game): Promise<void> {
  if (game.status !== "final") return; // never snapshot live/upcoming
  if (!game.id) return;
  try {
    await kv.set(snapshotKey(game.id), game, { ex: TTL_SECONDS });
  } catch (err) {
    // Snapshots are best-effort. A KV outage shouldn't break the cron.
    console.error("saveGameSnapshot failed", { gameId: game.id, err });
  }
}

/** Read back a snapshot. Returns null on miss or any error so the
 *  caller can decide the fallback path. */
export async function loadGameSnapshot(gameId: string): Promise<Game | null> {
  if (!gameId) return null;
  try {
    const game = await kv.get<Game>(snapshotKey(gameId));
    return game ?? null;
  } catch (err) {
    console.error("loadGameSnapshot failed", { gameId, err });
    return null;
  }
}

// Live Activity push-token store.
//
// When the iOS app starts a Live Activity for a pinned game, the device
// hands us a per-Activity *push token* (distinct from the device's APNs
// token used for alerts). We store it keyed by game id so the NBA/WC
// scan can push score updates to every device showing that game's Live
// Activity, then `end` them when the game finishes.
//
// These tokens are ephemeral — they die when the activity ends or the
// user dismisses it — so the store is keyed by game and self-prunes:
//   • KV set `nns:la:games` — game ids with at least one live activity
//   • KV set `nns:la:game:<gameId>` — push tokens for that game
//   • KV hash `nns:la:tok:<token>` — { gameId, sandbox, createdAt }
//
// APNs returns 410 for a dead activity token; the dispatcher calls
// removeActivityToken on that so the store stays clean.

import { kv } from "@vercel/kv";

const GAMES_INDEX = "nns:la:games";
const gameSetKey = (gameId: string) => `nns:la:game:${gameId}`;
const tokenKey = (token: string) => `nns:la:tok:${token}`;
// Last content-state signature we pushed for a game, so the scan loop
// skips re-pushing identical updates every tick (APNs efficiency).
const sigKey = (gameId: string) => `nns:la:sig:${gameId}`;

export type StoredActivityToken = {
  token: string;
  gameId: string;
  /** Whether the device build is a sandbox (Xcode debug) install. */
  sandbox: boolean;
  createdAt: number;
};

/** Register (or refresh) a Live Activity push token for a game. */
export async function registerActivityToken(input: {
  token: string;
  gameId: string;
  sandbox?: boolean;
}): Promise<void> {
  const record: StoredActivityToken = {
    token: input.token,
    gameId: input.gameId,
    sandbox: input.sandbox ?? true,
    createdAt: Date.now(),
  };
  await Promise.all([
    kv.set(tokenKey(input.token), record),
    kv.sadd(gameSetKey(input.gameId), input.token),
    kv.sadd(GAMES_INDEX, input.gameId),
  ]);
}

/** All push tokens currently showing a Live Activity for this game. */
export async function listActivityTokensForGame(
  gameId: string
): Promise<StoredActivityToken[]> {
  const tokens = await kv.smembers<string[]>(gameSetKey(gameId));
  if (!tokens || tokens.length === 0) return [];
  const rows = await Promise.all(
    tokens.map((t) => kv.get<StoredActivityToken>(tokenKey(t)))
  );
  return rows.filter((r): r is StoredActivityToken => r !== null);
}

/** Game ids that currently have at least one live activity. The scan
 *  loop iterates this to know which games to push updates for. */
export async function listActivityGameIds(): Promise<string[]> {
  return (await kv.smembers<string[]>(GAMES_INDEX)) ?? [];
}

/** Remove a single token (APNs 410, or the device reported the activity
 *  ended). Also clears the game's index entry when its set goes empty. */
export async function removeActivityToken(token: string): Promise<void> {
  const record = await kv.get<StoredActivityToken>(tokenKey(token));
  await kv.del(tokenKey(token));
  if (!record) return;
  await kv.srem(gameSetKey(record.gameId), token);
  const remaining = await kv.scard(gameSetKey(record.gameId));
  if (!remaining) await kv.srem(GAMES_INDEX, record.gameId);
}

/** Tear down all activity tokens for a finished game (after the `end`
 *  push has been sent). */
export async function clearActivityGame(gameId: string): Promise<void> {
  const tokens = await kv.smembers<string[]>(gameSetKey(gameId));
  await Promise.all([
    ...(tokens ?? []).map((t) => kv.del(tokenKey(t))),
    kv.del(gameSetKey(gameId)),
    kv.del(sigKey(gameId)),
    kv.srem(GAMES_INDEX, gameId),
  ]);
}

/** Last content-state signature pushed for a game (null if none yet). */
export async function getActivitySig(gameId: string): Promise<string | null> {
  return (await kv.get<string>(sigKey(gameId))) ?? null;
}

/** Remember the signature we just pushed, so the next identical tick
 *  is a no-op. Self-expires in 6h as a safety net against orphaned keys. */
export async function setActivitySig(gameId: string, sig: string): Promise<void> {
  await kv.set(sigKey(gameId), sig, { ex: 6 * 60 * 60 });
}

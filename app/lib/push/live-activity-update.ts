// Live Activity update loop — the server half of Phase 22.5-3 that
// makes the on-device Live Activity score tick during a real game.
//
// The NBA/WC scan crons already fetch every game each tick and run the
// notification detector. This module rides the same fetch: after the
// crons build a per-game content snapshot, they hand the list here and
// we push the fresh score to every device showing that game's Live
// Activity, then `end` the Activity when the game goes final.
//
// Cheap when nothing is live: one KV read (listActivityGameIds) and an
// early return when no device has an Activity open. We dedup on a
// signature (score / period / status) so an unchanged tick is a no-op
// and we don't hammer APNs every minute for a clock that we don't push
// anyway.
//
// Token lifecycle: APNs returns 410 (Unregistered) / 400 (BadDeviceToken)
// for a dead Activity token — we prune those from the store. When a game
// goes final we send one `end` push (with a ~2h linger so the final
// score stays on the lock screen) and tear the game's tokens down.

import {
  listActivityGameIds,
  listActivityTokensForGame,
  removeActivityToken,
  clearActivityGame,
  getActivitySig,
  setActivitySig,
} from "./live-activity-store";
import {
  sendApnsLiveActivity,
  type LiveActivityContentState,
} from "./apns-sender";

export type ActivityUpdateInput = {
  gameId: string;
  status: "live" | "upcoming" | "final";
  contentState: LiveActivityContentState;
  /** Meaningful-change signature (score / period / status). When it
   *  matches the last push, a live update is skipped. */
  sig: string;
};

// Dim the Live Activity's UI if we haven't pushed in this long (e.g. the
// scan stalled or the feed went quiet). The OS greys it to signal stale.
const STALE_AFTER_S = 15 * 60;
// Keep the final score on the lock screen this long after a game ends,
// then the OS auto-removes it. Calm payoff, not clutter.
const FINAL_LINGER_S = 2 * 60 * 60;

export type LiveActivityUpdateResult = {
  updated: number;
  ended: number;
  pruned: number;
};

export async function pushLiveActivityUpdates(
  inputs: ActivityUpdateInput[]
): Promise<LiveActivityUpdateResult> {
  // Vercel KV auto-coerces purely-numeric strings to JS numbers when
  // returning set members. NBA ESPN game IDs are all-digit (e.g.
  // "401873203") so listActivityGameIds() hands back numbers for those,
  // strings for non-numeric IDs (preview-wc-usa-tur etc.). We always
  // stored gameIds as strings; the Map below is keyed by string. Coerce
  // every active id back to string so the Map lookup actually matches.
  //
  // Diagnosed during launch night: the Live Activity for SA-OKC stayed
  // frozen on the lock screen for the entire game because every cron
  // tick hit byId.get(401873203 /* number */) and got undefined, so the
  // `continue` skipped the push. Token was correct, sandbox was
  // correct, score input was correct — the lookup was just typed wrong.
  const activeIds = (await listActivityGameIds()).map((id) => String(id));
  if (activeIds.length === 0) {
    return { updated: 0, ended: 0, pruned: 0 };
  }

  const byId = new Map(inputs.map((i) => [String(i.gameId), i]));
  let updated = 0;
  let ended = 0;
  let pruned = 0;

  for (const gameId of activeIds) {
    const input = byId.get(gameId);
    // Not in this tick's feed (other sport, or dropped off upstream).
    // Leave it — the staleDate on prior pushes dims it, and the device
    // ends it on next foreground poll.
    if (!input) continue;

    const tokens = await listActivityTokensForGame(gameId);
    if (tokens.length === 0) {
      await clearActivityGame(gameId);
      continue;
    }

    const isFinal = input.status === "final";

    // Live games: skip when nothing meaningful changed. Final always
    // sends (one terminal end push).
    if (!isFinal) {
      const last = await getActivitySig(gameId);
      if (last === input.sig) continue;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    for (const t of tokens) {
      const res = await sendApnsLiveActivity({
        pushToken: t.token,
        event: isFinal ? "end" : "update",
        contentState: input.contentState,
        sandbox: t.sandbox,
        staleDate: isFinal ? undefined : nowSec + STALE_AFTER_S,
        dismissalDate: isFinal ? nowSec + FINAL_LINGER_S : undefined,
        priority: 10,
      });
      if (res.ok) {
        if (isFinal) ended += 1;
        else updated += 1;
      } else if (res.status === 410 || res.status === 400) {
        await removeActivityToken(t.token);
        pruned += 1;
      }
      // Other errors (network, 429, 5xx): leave the token in place and
      // retry on the next tick.
    }

    if (isFinal) {
      await clearActivityGame(gameId);
    } else {
      await setActivitySig(gameId, input.sig);
    }
  }

  return { updated, ended, pruned };
}

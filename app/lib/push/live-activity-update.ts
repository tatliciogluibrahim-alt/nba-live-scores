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
import { runChunked } from "./run-chunked";

// Per-game APNs fan-out concurrency. Same cap as the regular
// dispatcher — Apple's HTTP/2 endpoint pools fine at 10 in flight
// and the wall clock is now slowest-single-token instead of
// sum-of-all-tokens per game. See run-chunked.ts.
const LIVE_ACTIVITY_FANOUT_CONCURRENCY = 10;

export type ActivityUpdateInput = {
  gameId: string;
  status: "live" | "upcoming" | "final";
  contentState: LiveActivityContentState;
  /** Full dedup signature (score / status / minute). When it matches the
   *  last push, a live update is skipped. Includes the clock so the real
   *  minute pushes through. */
  sig: string;
  /** The "meaningful" slice of the sig WITHOUT the clock (score / status /
   *  halftime). When only the minute advanced, the meaningful slice is
   *  unchanged → the update is sent at low priority (5) so the system can
   *  batch it; a score / status change keeps the meaningful slice moving →
   *  priority 10. Optional: callers that don't provide it (NBA today) get
   *  the previous always-priority-10 behavior. */
  meaningfulSig?: string;
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

    // APNs priority for this update. Final is always immediate (10).
    // For a live update we lower it to 5 when only the clock advanced so
    // the system can batch the minute ticks and conserve the update
    // budget; a score / status / halftime change stays at 10.
    let updatePriority: 5 | 10 = 10;

    // Live games: skip when nothing meaningful changed. Final always
    // sends (one terminal end push).
    if (!isFinal) {
      // The stored sig is a JSON `{s,m}` (full sig + meaningful slice).
      // Older deploys stored a plain string — tolerate that as `{s, m:null}`.
      const lastRaw = await getActivitySig(gameId);
      let lastSig: string | null = lastRaw;
      let lastMeaningful: string | null = null;
      if (lastRaw) {
        try {
          const parsed = JSON.parse(lastRaw);
          if (parsed && typeof parsed === "object" && typeof parsed.s === "string") {
            lastSig = parsed.s;
            lastMeaningful = typeof parsed.m === "string" ? parsed.m : null;
          }
        } catch {
          // lastRaw is an old plain-string sig; lastSig already holds it.
        }
      }

      if (lastSig === input.sig) {
        // Observability: log sig-matched skips during live games so we
        // can tell in Vercel logs when updates are being suppressed vs
        // when they're genuinely no-ops. Token count is safe to log;
        // the token prefix is already truncated in the Live Activity
        // APNs logs below.
        console.log("[live-activity] sig matched, skip", {
          gameId,
          sig: input.sig,
          tokens: tokens.length,
          statusLine: input.contentState.statusLine,
        });
        continue;
      }

      // Only the minute advanced (meaningful slice unchanged) → low
      // priority. No meaningful info on either side → keep 10 (safe).
      const minuteOnly =
        input.meaningfulSig != null &&
        lastMeaningful != null &&
        input.meaningfulSig === lastMeaningful;
      updatePriority = minuteOnly ? 5 : 10;

      // Log the change so we know what triggered this push.
      console.log("[live-activity] sig changed, pushing", {
        gameId,
        newSig: input.sig,
        prevSig: lastSig ?? "none",
        priority: updatePriority,
        tokens: tokens.length,
        statusLine: input.contentState.statusLine,
        score: `${input.contentState.awayCode} ${input.contentState.awayScore} - ${input.contentState.homeCode} ${input.contentState.homeScore}`,
      });
    } else {
      console.log("[live-activity] final, ending activity", {
        gameId,
        tokens: tokens.length,
        statusLine: input.contentState.statusLine,
      });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    // Per-token sends fan out in bounded chunks. Apple's HTTP/2
    // endpoint is happy at this concurrency and the wall clock drops
    // from N×round-trip to roughly one round-trip per chunk. The
    // shared `updated`/`ended`/`pruned` counters are mutated inside
    // each promise — safe under single-threaded JS because each `+=`
    // runs in one microtask tick. Failures inside a single token's
    // send are caught here so one bad token can't poison the chunk.
    await runChunked(tokens, LIVE_ACTIVITY_FANOUT_CONCURRENCY, async (t) => {
      try {
        const res = await sendApnsLiveActivity({
          pushToken: t.token,
          event: isFinal ? "end" : "update",
          contentState: input.contentState,
          sandbox: t.sandbox,
          staleDate: isFinal ? undefined : nowSec + STALE_AFTER_S,
          dismissalDate: isFinal ? nowSec + FINAL_LINGER_S : undefined,
          priority: isFinal ? 10 : updatePriority,
        });
        if (res.ok) {
          if (isFinal) ended += 1;
          else updated += 1;
        } else if (res.status === 410 || res.status === 400) {
          // Token is dead — remove from store. Log with a truncated
          // token prefix for traceability without logging the full token.
          console.warn("[live-activity] dead token pruned", {
            gameId,
            tokenPrefix: t.token.slice(0, 8),
            status: res.status,
            env: res.environment,
          });
          await removeActivityToken(t.token);
          pruned += 1;
        } else {
          // Transient error (429, 5xx, network). Leave token in place,
          // retry next tick.
          console.warn("[live-activity] push failed (transient)", {
            gameId,
            tokenPrefix: t.token.slice(0, 8),
            status: res.status,
            body: res.body?.slice(0, 120),
            err: res.error,
          });
        }
      } catch (err) {
        // Catch-all so the chunk's other tokens still finish even if
        // one token's send throws unexpectedly.
        console.warn("[live-activity] per-token send threw", {
          gameId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    });

    if (isFinal) {
      await clearActivityGame(gameId);
    } else {
      // Store both the full sig (dedup) and the meaningful slice (next
      // tick's priority decision) as JSON.
      await setActivitySig(
        gameId,
        JSON.stringify({ s: input.sig, m: input.meaningfulSig ?? null })
      );
    }
  }

  return { updated, ended, pruned };
}

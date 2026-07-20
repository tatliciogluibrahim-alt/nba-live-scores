// Push dispatcher — turns events into actual sendNotification calls.
//
// For each event:
//   1. Pull candidate subscriptions from the per-team reverse index.
//   2. Filter to subscriptions whose alert-enabled follows include either
//      team mentioned in the event.
//   3. Further filter by that follow's tier (preset-matcher).
//   4. For each survivor, claim a dedupe slot. Skip if already fired.
//   5. Build the payload and call web-push.sendNotification.
//   6. On 404/410 from the push service, drop the subscription from
//      the store (the device unsubscribed or the app was uninstalled).
//   7. Update lastSeenAt for surviving deliveries.

import {
  encodePushPayload,
  getWebPush,
  type PushPayload,
} from "./web-push-config";
import {
  SIGNIFICANCE_THRESHOLD,
  PERSONAL_BOOST,
  TIER_INVARIANT_EVENTS,
} from "./significance";
import {
  narratePush,
  pushNarrateEnabled,
  type PushNarrationInput,
} from "./narrate-push";
import { claimDelivery, releaseDelivery } from "./dedupe";
import { momentSport } from "../../companion/state/moments";
import {
  listSubscriptions,
  removeSubscription,
  touchSubscriptionLastSeen,
} from "./subscription-store";
import {
  listIosTokens,
  removeIosToken,
  touchIosToken,
} from "./ios-token-store";
import { sendApnsPush } from "./apns-sender";
import type { SyncedAlert, SyncedFollow } from "./sync-validation";
import { isWithinQuietHours } from "./quiet-hours";
import type { EventType, PushEvent } from "./event-detector";
import { incrCounter } from "./ops-metrics";
import { runChunked } from "./run-chunked";

// Bounded fan-out limit for both web push and APNs per-event loops.
// Cap of 10 keeps Upstash, the web-push services, and api.push.apple.com
// from being hammered with hundreds of simultaneous in-flight requests,
// while letting one slow endpoint stop blocking the other nine. See
// run-chunked.ts for the rationale.
const PUSH_FANOUT_CONCURRENCY = 10;

const WC_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "wc-kickoff",
  "wc-halftime",
  "wc-second-half",
  "wc-goal",
  "wc-final",
]);

function isWCEvent(event: PushEvent): boolean {
  return WC_EVENT_TYPES.has(event.type);
}

type DeliveryResult = {
  endpoint: string;
  delivered: boolean;
  /** Reason for non-delivery — debugging only, never surfaced to users. */
  reason?: string;
};

/** Stable key for the per-batch narrated-body cache — one narration per
 *  distinct (game, event type, scoreline). */
function narrationKey(event: PushEvent): string {
  return `${event.gameId}:${event.type}:${event.awayScore}-${event.homeScore}`;
}

/** Map a push event to the grounded facts the phraser may use. */
function pushNarrationInputFor(event: PushEvent): PushNarrationInput {
  return {
    type: event.type,
    away: event.awayCode,
    home: event.homeCode,
    awayScore: event.awayScore,
    homeScore: event.homeScore,
    ...(event.stage ? { stage: event.stage } : {}),
    ...(event.scorer ? { scorer: event.scorer } : {}),
  };
}

export async function dispatchEvents(events: PushEvent[]): Promise<{
  deliveries: DeliveryResult[];
  pruned: number;
}> {
  if (events.length === 0) return { deliveries: [], pruned: 0 };

  // Build the candidate subscription set. We used to query the
  // per-team reverse index for NBA events (Phase 2.4 optimization),
  // but that quietly excluded users who follow a series or tournament
  // *without* following the specific teams in it — the matcher below
  // can match four follow kinds (team / country / series / tournament)
  // and the index only knows about teams, so it was dropping
  // legitimate candidates pre-match.
  //
  // At friend-test scale this is fine; `listSubscriptions()` returns
  // O(total devices). If push volume grows past a few thousand subs
  // we can rebuild a multi-kind reverse index that covers all four
  // follow types, but that's premature today and was masking a real
  // correctness bug.
  const subs = await listSubscriptions();
  if (subs.length === 0) return { deliveries: [], pruned: 0 };

  const deliveries: DeliveryResult[] = [];
  let pruned = 0;
  const webpush = getWebPush();
  // Evaluated once per batch — quiet hours are per-device local windows.
  const nowMs = Date.now();

  // LLM copy (C4): phrase the spoiler body ONCE per significant event (not
  // per device), in parallel, before the fan-out. Off unless PUSH_NARRATE is
  // set; low-significance events keep their templates. A null result (timeout,
  // error, ungrounded, or kill switch off) means the template is used.
  const narratedBody = new Map<string, string>();
  if (pushNarrateEnabled()) {
    await Promise.all(
      events.map(async (event) => {
        if ((event.significance ?? 100) < SIGNIFICANCE_THRESHOLD.companion) return;
        const line = await narratePush(pushNarrationInputFor(event));
        if (line) narratedBody.set(narrationKey(event), line);
      })
    );
  }

  for (const event of events) {
    const eventTag = dedupeTagFor(event);
    const matching = subs.filter((s) => subscriberWantsEvent(s, event));

    // Per-event fan-out. Each sub is processed in its own promise via
    // runChunked, so within a chunk of 10 the slowest push-service
    // round-trip doesn't block the other nine. Counters and arrays
    // (`deliveries`, `pruned`) are mutated inside each promise — safe
    // under single-threaded JS because each `+=`/`push` runs in one
    // microtask tick. Original `continue`s became `return`s now that
    // the body lives inside an async function instead of a for-loop.
    await runChunked(matching, PUSH_FANOUT_CONCURRENCY, async (sub) => {
      // Quiet Hours: the user asked not to be disturbed in this window.
      // Skip delivery entirely (they catch up in-app). The dedupe slot
      // is intentionally NOT claimed, so a later event outside the
      // window still gets through.
      if (isWithinQuietHours(sub.quietHours, sub.timeZone, nowMs)) {
        deliveries.push({
          endpoint: sub.endpoint,
          delivered: false,
          reason: "quiet-hours",
        });
        return;
      }
      // Per-(sub, event) processing is wrapped so one catastrophic
      // failure (e.g. KV outage on claimDelivery) can't take down the
      // whole batch. Each sub records its own DeliveryResult.
      try {
        let claimed = false;
        try {
          claimed = await claimDelivery(eventTag, sub.endpoint);
        } catch (err) {
          // KV blip — skip this sub for now; next cron tick will retry.
          // We never want a KV blip to fan out duplicate pushes.
          console.warn("dispatch: claimDelivery threw, skipping", {
            eventTag,
            err: err instanceof Error ? err.message : String(err),
          });
          deliveries.push({
            endpoint: sub.endpoint,
            delivered: false,
            reason: "claim-failed",
          });
          await incrCounter("dispatch.claim-failed");
          return;
        }

        if (!claimed) {
          deliveries.push({
            endpoint: sub.endpoint,
            delivered: false,
            reason: "deduped",
          });
          await incrCounter("dispatch.deduped");
          return;
        }

        // Selective No-Spoilers is evaluated for this event, not just as a
        // device-wide preference. It gets the same safe template and LLM
        // suppression as global No-Spoilers.
        const eventNoSpoilers = subscriberUsesNoSpoilersForEvent(sub, event);
        const narrated = eventNoSpoilers
          ? undefined
          : narratedBody.get(narrationKey(event));
        const payload = {
          ...buildPayload(event, eventNoSpoilers, narrated),
          eventType: event.type,
        };
        let encoded: string;
        try {
          encoded = encodePushPayload(payload);
        } catch (err) {
          deliveries.push({
            endpoint: sub.endpoint,
            delivered: false,
            reason: err instanceof Error ? err.message : "payload-too-large",
          });
          await incrCounter("dispatch.payload-too-large");
          // Payload-too-large is a deterministic bug, not transient —
          // retrying won't help. Keep the dedupe slot claimed.
          return;
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            encoded
          );
          // Update the "alive" stamp so we know this subscription
          // is still delivering. Previously this called
          // upsertSubscription({ endpoint, keys }), which did a full
          // read-modify-write of the subscription record — racing
          // any concurrent /api/push/sync from the device. The race
          // could re-apply an alert the user had just toggled off.
          // touchSubscriptionLastSeen writes to a separate KV key
          // and reads nothing, so there's nothing to lose.
          await touchSubscriptionLastSeen(sub.endpoint);
          deliveries.push({ endpoint: sub.endpoint, delivered: true });
          await incrCounter("dispatch.delivered");
          // Per-event-type sent counter — denominator for the open-rate
          // the dashboard computes against notif.open.<type>. (21C.)
          await incrCounter(`notif.sent.${event.type}`);
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Permanent: the subscription is gone. Keep the dedupe
            // claim so we don't churn on a dead endpoint.
            await removeSubscription(sub.endpoint);
            pruned += 1;
            deliveries.push({
              endpoint: sub.endpoint,
              delivered: false,
              reason: "gone",
            });
            await incrCounter("dispatch.gone");
          } else {
            // Transient: release the dedupe slot so the next cron tick
            // can retry. Without this, a single push-service blip would
            // silently swallow the event for the rest of the dedupe TTL.
            await releaseDelivery(eventTag, sub.endpoint);
            deliveries.push({
              endpoint: sub.endpoint,
              delivered: false,
              reason: `push-failed-${statusCode ?? "?"}`,
            });
            await incrCounter("dispatch.failed");
          }
        }
      } catch (err) {
        // Final safety net — anything unexpected (e.g. upsertSubscription
        // throwing) lands here so the chunk's other subs still finish.
        console.error("dispatch: unexpected per-sub error", {
          eventTag,
          err: err instanceof Error ? err.message : String(err),
        });
        deliveries.push({
          endpoint: sub.endpoint,
          delivered: false,
          reason: "unexpected",
        });
      }
    });
  }

  // ── APNs fan-out (Phase 22.5-2) ────────────────────────────────────
  // Same matching logic as web push above, different transport. iOS
  // tokens registered via the Capacitor wrapper land in
  // ios-token-store; we iterate them here and send via sendApnsPush.
  // The dedupe key uses a token-prefix scheme distinct from web push
  // endpoint URLs, so a user with both an iOS install and a web PWA
  // install gets the push on both surfaces (one per transport).
  const iosTokens = await listIosTokens();
  // Track APNs delivery health across the batch so a TOTAL outage (every
  // attempted send failed) emits a distinct operator signal — not just
  // per-token "apns.failed" lines that blur into normal noise. The
  // counter incremented at the end of the loop lets the ops dashboard
  // flag "APNs is down" the same way "ESPN is down" surfaces from the
  // feed routes' 503s.
  let apnsAttempted = 0;
  let apnsDelivered = 0;
  for (const event of events) {
    const eventTag = dedupeTagFor(event);
    const matching = iosTokens.filter((t) => subscriberWantsEvent(t, event));

    // Same fan-out shape as web push above. Per-token processing runs
    // in chunks of 10 in parallel — Apple's HTTP/2 endpoint pools the
    // connection (we already pass allowH2 in apns-sender) so this is
    // safe and cuts the wall clock from N×~200ms to roughly the
    // slowest single round-trip per chunk.
    await runChunked(matching, PUSH_FANOUT_CONCURRENCY, async (ios) => {
      // Quiet Hours (same rule as web): skip delivery in-window, leave
      // the dedupe slot unclaimed so a later out-of-window event lands.
      if (isWithinQuietHours(ios.quietHours, ios.timeZone, nowMs)) {
        deliveries.push({
          endpoint: `apns:${ios.token.slice(0, 8)}…`,
          delivered: false,
          reason: "quiet-hours",
        });
        return;
      }
      try {
        // Token-scoped dedupe key. Distinct from web push endpoint
        // claims so an event can fan out to BOTH a web sub and an
        // iOS token belonging to the same user.
        const claimKey = `apns:${ios.token.slice(0, 16)}`;
        let claimed = false;
        try {
          claimed = await claimDelivery(eventTag, claimKey);
        } catch (err) {
          console.warn("dispatch.apns: claimDelivery threw, skipping", {
            eventTag,
            err: err instanceof Error ? err.message : String(err),
          });
          deliveries.push({
            endpoint: `apns:${ios.token.slice(0, 8)}…`,
            delivered: false,
            reason: "claim-failed",
          });
          await incrCounter("dispatch.apns.claim-failed");
          return;
        }

        if (!claimed) {
          deliveries.push({
            endpoint: `apns:${ios.token.slice(0, 8)}…`,
            delivered: false,
            reason: "deduped",
          });
          await incrCounter("dispatch.apns.deduped");
          return;
        }

        // Lock-screen live-score offer: for an eligible iOS recipient at
        // kickoff, send the offer variant INSTEAD of the plain start push
        // (one payload per recipient, so no double notification). The tap
        // carries data the web layer reads to pin the game + start the
        // Live Activity. Everyone else gets the normal payload.
        const offer = wantsLiveActivityOffer(ios, event);
        const eventNoSpoilers = subscriberUsesNoSpoilersForEvent(ios, event);
        const iosNarrated = eventNoSpoilers
          ? undefined
          : narratedBody.get(narrationKey(event));
        const payload = offer
          ? buildLiveActivityOfferPayload(event)
          : buildPayload(event, eventNoSpoilers, iosNarrated);
        apnsAttempted += 1;
        const result = await sendApnsPush({
          deviceToken: ios.token,
          title: payload.title,
          subtitle: payload.subtitle,
          body: payload.body,
          collapseId: payload.tag,
          // Capacitor does not navigate from a notification tap on its own.
          // Preserve the transport-neutral payload URL in top-level APNs
          // data for every native push; offers add pin metadata alongside it.
          data: offer
            ? liveActivityOfferData(event)
            : { url: payload.url ?? `/game/${event.gameId}` },
          // PRODUCTION. TestFlight + App Store builds get their device
          // tokens from the production APNs endpoint
          // (api.push.apple.com). Sending to sandbox
          // (api.sandbox.push.apple.com) returns BadDeviceToken for
          // these tokens and the push silently dies — which is exactly
          // what happened during launch night when delivered=0 across
          // every event despite the dispatcher iterating the right
          // token rows with the right follows. Flipping this fixed the
          // missing notifications end-to-end. If you ever need sandbox
          // again for an Xcode debug build, gate this on an env var
          // (e.g. APNS_USE_SANDBOX=true) rather than re-hardcoding.
          sandbox: false,
        });

        if (result.ok) {
          apnsDelivered += 1;
          await touchIosToken(ios.token);
          deliveries.push({
            endpoint: `apns:${ios.token.slice(0, 8)}…`,
            delivered: true,
          });
          await incrCounter("dispatch.apns.delivered");
        } else if (result.status === 410) {
          // Apple: token has been invalidated (app uninstalled,
          // token rotated). Permanent — drop from store.
          await removeIosToken(ios.token);
          pruned += 1;
          deliveries.push({
            endpoint: `apns:${ios.token.slice(0, 8)}…`,
            delivered: false,
            reason: "gone",
          });
          await incrCounter("dispatch.apns.gone");
        } else {
          // Transient or non-410 error. Release the dedupe claim so
          // the next cron tick can retry.
          await releaseDelivery(eventTag, claimKey);
          deliveries.push({
            endpoint: `apns:${ios.token.slice(0, 8)}…`,
            delivered: false,
            reason: `apns-failed-${result.status}`,
          });
          await incrCounter("dispatch.apns.failed");
          console.warn("dispatch.apns: send failed", {
            eventTag,
            status: result.status,
            body: result.body,
            error: result.error,
          });
        }
      } catch (err) {
        console.error("dispatch.apns: unexpected per-token error", {
          eventTag,
          err: err instanceof Error ? err.message : String(err),
        });
        deliveries.push({
          endpoint: `apns:${ios.token.slice(0, 8)}…`,
          delivered: false,
          reason: "unexpected",
        });
      }
    });
  }

  // APNs total-outage signal: at least 3 deliveries attempted and
  // none succeeded. Most likely Apple's APNs endpoint is unreachable
  // or the signing key has flipped environments (the launch-night bug).
  // The dashboard reads this counter to alert before users notice.
  // Threshold of 3 avoids noise from a single bad token in low-volume
  // batches (friend-beta scale); raise it if false-positives appear.
  if (apnsAttempted >= 3 && apnsDelivered === 0) {
    await incrCounter("dispatch.apns.total-failure");
    console.error("dispatch.apns: TOTAL FAILURE", {
      attempted: apnsAttempted,
      delivered: apnsDelivered,
      events: events.length,
    });
  }

  return { deliveries, pruned };
}

/** Events whose copy reveals closeness or comeback drama. These get
 *  suppressed for subscriptions where noSpoilers is true, even if the
 *  user picked the "Close games" tier (internal key: "all") — they
 *  opted into both, both should be respected. (Codex QA #1.) */
const SPOILERY_EVENTS = new Set<PushEvent["type"]>(["close-game", "comeback"]);

/** The shared shape both web push subscriptions and iOS APNs tokens
 *  expose to the dispatcher's matcher. Both stores normalize their
 *  records into something with these two fields. */
type SubscriberPreferences = {
  alerts: SyncedAlert[];
  noSpoilers: boolean;
  /** Hidden follows without an alert slot. Optional keeps old KV rows and
   * test fixtures backward-compatible. */
  spoilerFollows?: SyncedFollow[];
};

/** Selective No-Spoilers matching mirrors the in-app contract: a series
 * protects only games containing both teams in its key. Whole-tournament hiding
 * remains intentionally excluded and belongs to the global toggle. */
function selectiveFollowMatchesEvent(
  follow: SyncedFollow,
  event: PushEvent
): boolean {
  // Sport gate first (Path B): the follow's moment must belong to the
  // event's sport. This is what keeps an NFL "LAC" from matching an NBA
  // LAC event once gate 3 ships.
  const wc = isWCEvent(event);
  if (momentSport(follow.momentId) !== (wc ? "wc" : "nba")) return false;
  const id = (follow.scopeId ?? "").trim().toUpperCase();
  if (!id) return false;
  const away = event.awayCode.trim().toUpperCase();
  const home = event.homeCode.trim().toUpperCase();
  if (follow.scope === "team" || follow.scope === "country") {
    return id === away || id === home;
  }
  if (follow.scope === "series") {
    const [a, b] = id.split("-");
    const has = (code: string) => code === away || code === home;
    return Boolean(a && b && has(a) && has(b));
  }
  return false;
}

/** Effective No-Spoilers for one subscriber/event pair. Exported so tests
 * can lock the redaction boundary independently from transport fanout. */
export function subscriberUsesNoSpoilersForEvent(
  sub: SubscriberPreferences,
  event: PushEvent
): boolean {
  if (sub.noSpoilers) return true;

  const hiddenAlertMatches = (Array.isArray(sub.alerts) ? sub.alerts : []).some(
    (alert) =>
      alert.hideSpoilers === true && selectiveFollowMatchesEvent(alert, event)
  );
  if (hiddenAlertMatches) return true;

  return (
    Array.isArray(sub.spoilerFollows) &&
    sub.spoilerFollows.some((follow) =>
      selectiveFollowMatchesEvent(follow, event)
    )
  );
}

/** Transport-neutral matcher. Returns true when the subscriber's
 *  alerts + noSpoilers combination matches the event. Same logic
 *  whether the subscriber is a web push endpoint or an APNs token —
 *  the differences live in the delivery layer, not the matching.
 *  Exported for unit tests (dispatcher.test.ts). */
export function subscriberWantsEvent(
  sub: SubscriberPreferences,
  event: PushEvent
): boolean {
  // Global and selective No-Spoilers share the same unsafe-event gate.
  // Close-game/comeback copy reveals drama even without an explicit score.
  if (
    subscriberUsesNoSpoilersForEvent(sub, event) &&
    SPOILERY_EVENTS.has(event.type)
  ) {
    return false;
  }

  const alerts = Array.isArray(sub.alerts) ? sub.alerts : [];
  const wc = isWCEvent(event);
  const eventSport = wc ? "wc" : "nba";
  // Significance gate (2026-07-14 engine). Tiers are thresholds, not event
  // lists: a directly-followed entity's tense moment breaks through even on
  // Quiet, and low-stakes events are suppressed everywhere but Full Details.
  // Fail-open: an unscored event (older detector path) reads as always
  // significant, so nothing silently drops an alert.
  const significance = event.significance ?? 100;

  // Path B matching: sport gate via the follow's moment, then a per-scope
  // predicate. An entity scope (team / country / series) is "direct" and
  // earns the personal boost + the start/final invariant floor; the
  // whole-moment scope ("all", the old tournament follow) is threshold-only.
  // Adding NFL is a new momentSport value — zero changes here.
  return alerts.some((f) => {
    if (momentSport(f.momentId) !== eventSport) return false;

    let matched = false;
    let direct = false;
    const scopeId = f.scopeId ?? "";

    if (f.scope === "team" || f.scope === "country") {
      if (scopeId === event.awayCode || scopeId === event.homeCode) {
        matched = true;
        direct = true;
      }
    } else if (f.scope === "series") {
      const [a, b] = scopeId.split("-");
      const has = (code: string) =>
        code === event.awayCode || code === event.homeCode;
      if (a && b && has(a) && has(b)) {
        matched = true;
        direct = true;
      }
    } else if (f.scope === "all") {
      matched = true; // sport already gated via the moment
    }

    if (!matched) return false;
    // Tier promise as a hard floor: a direct follow ALWAYS gets its team's
    // start and final, regardless of score or a future weight retune. The
    // threshold governs the middle (goals, breaks, close games) + tournament
    // follows, where breakthrough still applies.
    if (direct && TIER_INVARIANT_EVENTS.has(event.type)) return true;
    const score = significance + (direct ? PERSONAL_BOOST : 0);
    return score >= SIGNIFICANCE_THRESHOLD[f.tier];
  });
}

/** Format the score line for push bodies. Matches the canonical
 *  Stadium Panel format used in the SevenDotStrip detail card and the
 *  series-data adapter: "AWAY awayScore – homeScore HOME". */
function scoreLine(event: PushEvent): string {
  return `${event.awayCode} ${event.awayScore} – ${event.homeScore} ${event.homeCode}`;
}

/** Dedupe tag for an event. Normally `${gameId}:${type}` (one push per
 *  event per device), but goals can happen several times in one match,
 *  so wc-goal folds the scoreline into the tag — each distinct scoreline
 *  is its own dedupe slot, while a repeated identical tick is still
 *  suppressed. */
function dedupeTagFor(event: PushEvent): string {
  if (event.type === "wc-goal") {
    return `${event.gameId}:wc-goal:${event.awayScore}-${event.homeScore}`;
  }
  if (event.type === "nba-highlight") {
    // Distinct milestones / players in one game must each get through.
    return `${event.gameId}:nba-highlight:${event.note ?? ""}`;
  }
  return `${event.gameId}:${event.type}`;
}

/** Start-of-game events that the lock-screen offer rides on. The offer
 *  variant only ever replaces these. */
const START_EVENT_TYPES = new Set<PushEvent["type"]>(["tipoff", "wc-kickoff"]);

/** True when the event is a game-start event (NBA tipoff or WC kickoff). */
export function isStartEvent(event: PushEvent): boolean {
  return START_EVENT_TYPES.has(event.type);
}

/** Eligibility for the lock-screen live-score offer variant. iOS-only by
 *  construction (only the APNs loop calls it). Default ON: a token whose
 *  lockScreenOffers is undefined is treated as opted in. */
export function wantsLiveActivityOffer(
  token: { lockScreenOffers?: boolean },
  event: PushEvent
): boolean {
  return isStartEvent(event) && token.lockScreenOffers !== false;
}

/** The matchup used as the offer title, e.g. "BRA vs JPN". */
function offerMatchup(event: PushEvent): string {
  return `${event.awayCode} vs ${event.homeCode}`;
}

/** The collapse tag for a start event — must match the tag buildPayload
 *  uses for the same event so the offer and the normal start push share a
 *  Notification Center slot. */
function startTag(event: PushEvent): string {
  return event.type === "wc-kickoff"
    ? `${event.gameId}:wc-state`
    : `${event.gameId}:tipoff`;
}

/** Stakes line for the offer subtitle. Spoiler-safe (carries no score —
 *  the round/game number is not a spoiler). Game 7 and WC knockout rounds
 *  keep their stakes so the offer doesn't flatten the highest-stakes
 *  moments; everything else reads "Starting now". Mirrors the framing
 *  buildPayload gives the same start events. */
function offerSubtitle(event: PushEvent): string {
  if (event.isGame7) return "Game 7 · series on the line";
  const koStage =
    event.stage && !/^group/i.test(event.stage) && event.stage.trim() !== ""
      ? event.stage
      : null;
  if (koStage) return koStage;
  return "Starting now";
}

/** The "tap to add the live score to your lock screen" offer payload.
 *  Spoiler-safe by construction (start = 0-0, no score in copy). iOS only;
 *  never sent to web push. The url carries an ?offer marker as a fallback
 *  so older builds without the tap handler still land on the game page. */
export function buildLiveActivityOfferPayload(event: PushEvent): PushPayload {
  return {
    title: offerMatchup(event),
    subtitle: offerSubtitle(event),
    body: "Track this match on your Lock Screen.",
    url: `/game/${event.gameId}?offer=live-activity`,
    tag: startTag(event),
  };
}

/** Custom APNs data the tap handler reads to pin the game + start the
 *  Live Activity. Sent as top-level keys alongside `aps`. */
export function liveActivityOfferData(event: PushEvent): Record<string, string> {
  return {
    type: "live-activity-offer",
    gameId: event.gameId,
    sport: isWCEvent(event) ? "wc" : "nba",
    url: `/game/${event.gameId}?offer=live-activity`,
  };
}

/** Build the push payload. When `narratedBody` is provided (the LLM copy,
 *  spoiler variant only), it replaces the template body; title/subtitle/tag/
 *  url stay the deterministic template so structure and collapse behavior are
 *  unchanged. Null/absent → pure template (today's behavior). */
export function buildPayload(
  event: PushEvent,
  noSpoilers: boolean,
  narratedBody?: string
): PushPayload {
  const base = buildTemplatePayload(event, noSpoilers);
  return narratedBody ? { ...base, body: narratedBody } : base;
}

function buildTemplatePayload(event: PushEvent, noSpoilers: boolean): PushPayload {
  const matchup = `${event.awayCode} vs ${event.homeCode}`;
  // Knockout WC matches add the round to the subtitle ("USA vs POR ·
  // Round of 32") so a win-or-go-home alert reads with its stakes. Group
  // stage and NBA keep the plain matchup.
  const koStage =
    event.stage && !/^group/i.test(event.stage) && event.stage.trim() !== ""
      ? event.stage
      : null;
  const wcSubtitle = koStage ? `${matchup} · ${koStage}` : matchup;
  // Title / subtitle / body shape:
  //   • title    — the EVENT ("Final", "End of Q3", "Halftime")
  //   • subtitle — the MATCHUP ("SA vs OKC")
  //   • body     — the SCORE or context line
  // Why the split: iOS shows title (bold), then subtitle, then body in
  // a clean three-line stack. When subtitle is OMITTED, iOS inserts
  // "from <App Name>" in that middle slot (the awkward layout user
  // feedback flagged on launch night). With subtitle present, the app
  // attribution moves to the header where it belongs.
  //
  // For No-Spoilers users the body must never contain a score, a
  // winner, or a closeness signal. They get a calm "something
  // happened, tap to check" body. The dispatcher already suppresses
  // close-game entirely for them, so that branch is non-NoSpoilers
  // only by the time we reach buildPayload.
  switch (event.type) {
    case "tipoff":
      // Phase 21C-G7 — Game 7 override. When ESPN's gameContext flags
      // this as Game 7 of a series, lean into the stakes.
      if (event.isGame7) {
        return {
          title: "Game 7",
          subtitle: matchup,
          body: "Series on the line. Tap to follow along.",
          url: `/game/${event.gameId}`,
          tag: `${event.gameId}:tipoff`,
        };
      }
      return {
        title: "Tipoff",
        subtitle: matchup,
        body: "Game's underway. Tap to follow along.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:tipoff`,
      };
    case "eoq-1":
      return {
        title: "End of Q1",
        subtitle: matchup,
        body: noSpoilers ? "Quarter wrapped. Tap to check in." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "eoq-2":
      return {
        title: "Halftime",
        subtitle: matchup,
        body: noSpoilers ? "Half done. Tap to check in." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "eoq-3":
      return {
        title: "End of Q3",
        subtitle: matchup,
        body: noSpoilers ? "One quarter left." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "second-half-start":
      return {
        title: "Second half",
        subtitle: matchup,
        body: noSpoilers ? "Third quarter underway." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:second-half`,
      };
    case "close-game":
      return {
        title: "Q4 · close game",
        subtitle: matchup,
        body: `${scoreLine(event)} · one possession`,
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:close`,
      };
    case "comeback":
      return {
        title: "Comeback",
        subtitle: matchup,
        body: `${scoreLine(event)} · lead erased`,
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:comeback`,
      };
    case "nba-highlight":
      return {
        title: "Highlight",
        subtitle: matchup,
        body: noSpoilers
          ? "A big individual moment. Tap to check in."
          : event.note ?? scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:highlight:${event.note ?? ""}`,
      };
    case "final":
      return {
        title: "Final",
        subtitle: matchup,
        body: noSpoilers ? "Game's done. Tap when you're ready." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:final`,
      };
    // WC match-STATE pushes (kickoff → halftime → second half → full time)
    // share one `${gameId}:wc-state` tag so each state REPLACES the last in
    // Notification Center (web `tag` + APNs collapse-id both key off it).
    // A finished match leaves the goals + one "Full time" card, never a
    // stale "Halftime" stack (peer review 2026-07-11). Goals keep their
    // per-scoreline tags below — user-requested events persist. Delivery
    // dedupe is dedupeTagFor (separate function), untouched by these tags.
    case "wc-kickoff":
      return {
        title: "Kickoff",
        subtitle: wcSubtitle,
        body: "The match is underway. Tap to follow along.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-state`,
      };
    case "wc-halftime":
      return {
        title: "Halftime",
        subtitle: wcSubtitle,
        body: noSpoilers ? "Half done. Tap to check in." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-state`,
      };
    case "wc-second-half":
      return {
        title: "Second half",
        subtitle: wcSubtitle,
        body: noSpoilers
          ? "Second half underway. Tap to check in."
          : `${scoreLine(event)} · Second half started`,
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-state`,
      };
    case "wc-goal":
      return {
        title: "Goal",
        subtitle: wcSubtitle,
        body: noSpoilers
          ? "Someone scored. Tap to check in."
          : event.scorer
            ? `${event.scorer} · ${scoreLine(event)}`
            : `${scoreLine(event)} · Goal`,
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-goal:${event.awayScore}-${event.homeScore}`,
      };
    case "wc-final":
      return {
        title: "Full time",
        subtitle: wcSubtitle,
        body: noSpoilers
          ? "Match wrapped. Tap when you're ready."
          : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-state`,
      };

    // ── NFL (Phase 22). Game-state events share one collapse tag
    // (`${id}:nfl-state`) like the WC lifecycle, so each replaces the last;
    // per-play events keep their own tag so goals/TDs persist. No-Spoilers
    // drops the score AND the player name (a name is itself a fantasy
    // spoiler, per docs/nfl-design.md) — the title stays neutral. ──────────
    case "nfl-kickoff":
      return nflPayload(event, "Kickoff", noSpoilers ? "The game is underway." : matchup, `${event.gameId}:nfl-state`);
    case "nfl-eoq-1":
      return nflPayload(event, "End of Q1", noSpoilers ? "First quarter wrapped." : scoreLine(event), `${event.gameId}:nfl-state`);
    case "nfl-halftime":
      return nflPayload(event, "Halftime", noSpoilers ? "Halftime. Tap to check in." : scoreLine(event), `${event.gameId}:nfl-state`);
    case "nfl-eoq-3":
      return nflPayload(event, "End of Q3", noSpoilers ? "Third quarter wrapped." : scoreLine(event), `${event.gameId}:nfl-state`);
    case "nfl-ot":
      return nflPayload(event, "Overtime", noSpoilers ? "We're going to overtime." : scoreLine(event), `${event.gameId}:nfl-state`);
    case "nfl-final":
      return nflPayload(event, "Final", noSpoilers ? "Game wrapped. Tap when you're ready." : scoreLine(event), `${event.gameId}:nfl-state`);
    case "nfl-td-rushing":
    case "nfl-td-receiving":
    case "nfl-td-defensive":
      return nflPayload(event, "Touchdown", noSpoilers ? "A touchdown was scored." : event.note ?? scoreLine(event), `${event.gameId}:${event.type}:${event.awayScore}-${event.homeScore}`);
    case "nfl-fg":
      return nflPayload(event, "Field goal", noSpoilers ? "A field goal was made." : event.note ?? scoreLine(event), `${event.gameId}:nfl-fg:${event.awayScore}-${event.homeScore}`);
    case "nfl-safety":
      return nflPayload(event, "Safety", noSpoilers ? "A safety was scored." : event.note ?? scoreLine(event), `${event.gameId}:nfl-safety:${event.awayScore}-${event.homeScore}`);
    case "nfl-2pt":
      return nflPayload(event, "Two-point try", noSpoilers ? "A two-point conversion was attempted." : event.note ?? scoreLine(event), `${event.gameId}:nfl-2pt:${event.awayScore}-${event.homeScore}`);
    case "nfl-turnover":
      return nflPayload(event, "Turnover", noSpoilers ? "A turnover changed possession." : event.note ?? matchup, `${event.gameId}:nfl-turnover:${event.note ?? ""}`);
    case "nfl-big-play-rush":
    case "nfl-big-play-rec":
      return nflPayload(event, "Big play", noSpoilers ? "A big play just happened." : event.note ?? matchup, `${event.gameId}:${event.type}:${event.note ?? ""}`);
  }
}

/** Shared NFL payload shape — subtitle is always the plain matchup (NFL
 *  carries no knockout stage), url is the game detail. */
function nflPayload(
  event: PushEvent,
  title: string,
  body: string,
  tag: string
): PushPayload {
  return {
    title,
    subtitle: `${event.awayCode} vs ${event.homeCode}`,
    body,
    url: `/game/${event.gameId}`,
    tag,
  };
}

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
import { presetMatchesEvent } from "./preset-matcher";
import type { AlertPreset } from "../../companion/state/types";
import { claimDelivery, releaseDelivery } from "./dedupe";
import {
  listSubscriptions,
  removeSubscription,
  upsertSubscription,
} from "./subscription-store";
import {
  listIosTokens,
  removeIosToken,
  touchIosToken,
} from "./ios-token-store";
import { sendApnsPush } from "./apns-sender";
import type { SyncedAlert } from "./sync-validation";
import type { EventType, PushEvent } from "./event-detector";
import { incrCounter } from "./ops-metrics";

const WC_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "wc-kickoff",
  "wc-halftime",
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

  for (const event of events) {
    const eventTag = dedupeTagFor(event);
    const matching = subs.filter((s) => subscriberWantsEvent(s, event));

    for (const sub of matching) {
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
          continue;
        }

        if (!claimed) {
          deliveries.push({
            endpoint: sub.endpoint,
            delivered: false,
            reason: "deduped",
          });
          await incrCounter("dispatch.deduped");
          continue;
        }

        const payload = { ...buildPayload(event, sub.noSpoilers), eventType: event.type };
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
          continue;
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            encoded
          );
          // Update lastSeenAt so we know this subscription is alive.
          await upsertSubscription({
            endpoint: sub.endpoint,
            keys: sub.keys,
          });
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
        // throwing) lands here so the loop can continue to the next sub.
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
    }
  }

  // ── APNs fan-out (Phase 22.5-2) ────────────────────────────────────
  // Same matching logic as web push above, different transport. iOS
  // tokens registered via the Capacitor wrapper land in
  // ios-token-store; we iterate them here and send via sendApnsPush.
  // The dedupe key uses a token-prefix scheme distinct from web push
  // endpoint URLs, so a user with both an iOS install and a web PWA
  // install gets the push on both surfaces (one per transport).
  const iosTokens = await listIosTokens();
  for (const event of events) {
    const eventTag = dedupeTagFor(event);
    const matching = iosTokens.filter((t) => subscriberWantsEvent(t, event));

    for (const ios of matching) {
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
          continue;
        }

        if (!claimed) {
          deliveries.push({
            endpoint: `apns:${ios.token.slice(0, 8)}…`,
            delivered: false,
            reason: "deduped",
          });
          await incrCounter("dispatch.apns.deduped");
          continue;
        }

        const payload = buildPayload(event, ios.noSpoilers);
        const result = await sendApnsPush({
          deviceToken: ios.token,
          title: payload.title,
          body: payload.body,
          // Sandbox while the build is installed via Xcode debug.
          // Flip to false when shipping TestFlight / App Store.
          sandbox: true,
        });

        if (result.ok) {
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
    }
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
};

/** Transport-neutral matcher. Returns true when the subscriber's
 *  alerts + noSpoilers combination matches the event. Same logic
 *  whether the subscriber is a web push endpoint or an APNs token —
 *  the differences live in the delivery layer, not the matching. */
function subscriberWantsEvent(
  sub: SubscriberPreferences,
  event: PushEvent
): boolean {
  // No-Spoilers gate. The user explicitly opted into hiding closeness
  // across the entire app — push notifications must honor that too.
  if (sub.noSpoilers && SPOILERY_EVENTS.has(event.type)) return false;

  const alerts = Array.isArray(sub.alerts) ? sub.alerts : [];
  const wc = isWCEvent(event);
  const tierOk = (tier: AlertPreset) => presetMatchesEvent(tier, event.type);

  // The Following UI offers four kinds — team, country, series,
  // tournament. Each kind has its own way of matching to an event:
  //
  //   1. Direct entity match
  //      NBA event ↔ team follow whose id matches awayCode/homeCode
  //      WC  event ↔ country follow whose id matches awayCode/homeCode
  //
  //   2. Series match (NBA only — the schema has no WC series follows)
  //      A series follow's id is `${teamA}-${teamB}` (sorted). The
  //      event matches if BOTH team codes are in that id. This is what
  //      lets a user follow the "OKC vs SA" series once and get pings
  //      for every game in it, regardless of home/away.
  //
  //   3. Tournament match (broadest follow)
  //      NBA event ↔ tournament follow whose id starts with
  //                    "nba-playoffs-" (covers future seasons too)
  //      WC  event ↔ tournament follow whose id starts with
  //                    "fifa-world-cup-"
  //
  // Any one of these matches with a tier that includes the event type
  // is enough to fan out. Per-tier filtering applies uniformly across
  // all four kinds — "Quiet" still gets bookends only, etc.
  return alerts.some((f) => {
    if (!tierOk(f.tier)) return false;

    // 1. Direct entity.
    if (
      ((wc && f.kind === "country") || (!wc && f.kind === "team")) &&
      (f.id === event.awayCode || f.id === event.homeCode)
    ) {
      return true;
    }

    // 2. Series — NBA only. Series ids are `${teamA}-${teamB}`.
    if (!wc && f.kind === "series") {
      const [a, b] = f.id.split("-");
      const has = (code: string) =>
        code === event.awayCode || code === event.homeCode;
      if (a && b && has(a) && has(b)) return true;
    }

    // 3. Tournament — match by id prefix so future seasons
    //    (`nba-playoffs-2026`, etc.) inherit without code changes.
    if (f.kind === "tournament") {
      if (wc && f.id.startsWith("fifa-world-cup-")) return true;
      if (!wc && f.id.startsWith("nba-playoffs-")) return true;
    }

    return false;
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
  return `${event.gameId}:${event.type}`;
}

function buildPayload(event: PushEvent, noSpoilers: boolean): PushPayload {
  const matchup = `${event.awayCode} vs ${event.homeCode}`;
  // For No-Spoilers users the body must never contain a score, a
  // winner, or a closeness signal. They get a calm "something
  // happened, tap to check" body. The dispatcher already suppresses
  // close-game entirely for them, so that branch is non-NoSpoilers
  // only by the time we reach buildPayload.
  switch (event.type) {
    case "tipoff":
      // Phase 21C-G7 — Game 7 override. When ESPN's gameContext flags
      // this as Game 7 of a series, swap the title + body to lean into
      // the stakes. Same delivery path, different copy. Score is 0-0
      // at tipoff so we omit it whether or not No-Spoilers is on; the
      // body just sets the moment. Tipoff is already in every tier
      // (quiet/companion/all) so no tier-filter override is needed —
      // the matcher already lets Quiet followers through.
      if (event.isGame7) {
        return {
          title: `Game 7 · ${matchup}`,
          body: "Series on the line. Tap to follow along.",
          url: `/game/${event.gameId}`,
          tag: `${event.gameId}:tipoff`,
        };
      }
      // At tipoff the score is 0-0; nothing useful to include either way.
      return {
        title: `Tipoff · ${matchup}`,
        body: "Game's underway. Tap to follow along.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:tipoff`,
      };
    case "eoq-1":
      return {
        title: `End of Q1 · ${matchup}`,
        body: noSpoilers ? "Quarter wrapped. Tap to check in." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "eoq-2":
      return {
        title: `Halftime · ${matchup}`,
        body: noSpoilers ? "Half done. Tap to check in." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "eoq-3":
      return {
        title: `End of Q3 · ${matchup}`,
        body: noSpoilers ? "One quarter left." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "close-game":
      // close-game is suppressed entirely for noSpoilers (see
      // subscriptionWantsEvent), so we can assume scores are wanted here.
      return {
        title: `Q4 · ${matchup}`,
        body: `${scoreLine(event)} · one possession`,
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:close`,
      };
    case "comeback":
      // Like close-game: suppressed for noSpoilers users. Body leans
      // into the drama because the "All moments" tier is explicitly
      // asking for it.
      return {
        title: `Comeback · ${matchup}`,
        body: `${scoreLine(event)} · lead erased`,
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:comeback`,
      };
    case "final":
      return {
        title: `Final · ${matchup}`,
        body: noSpoilers ? "Game's done. Tap when you're ready." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:final`,
      };
    case "wc-kickoff":
      // World Cup kickoff — soccer-bespoke verb ("Kickoff" not "Tipoff").
      // Score is 0–0 at kickoff so we omit it whether or not No-Spoilers
      // is on; the body just sets the moment.
      return {
        title: `Kickoff · ${matchup}`,
        body: "The match is underway. Tap to follow along.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-kickoff`,
      };
    case "wc-halftime":
      return {
        title: `Second half · ${matchup}`,
        body: noSpoilers
          ? "Second half underway. Tap to check in."
          : `${scoreLine(event)} · Second half started`,
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-halftime`,
      };
    case "wc-goal":
      return {
        title: `Goal · ${matchup}`,
        body: noSpoilers
          ? "Someone scored. Tap to check in."
          : `${scoreLine(event)} · Goal`,
        url: `/game/${event.gameId}`,
        // Note: no per-goal tag suffix beyond the type — back-to-back
        // goals are distinct events with distinct scorelines, but the
        // dedupe layer keys on gameId:type:scoreline upstream.
        tag: `${event.gameId}:wc-goal:${event.awayScore}-${event.homeScore}`,
      };
    case "wc-final":
      return {
        title: `Full time · ${matchup}`,
        body: noSpoilers
          ? "Match wrapped. Tap when you're ready."
          : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:wc-final`,
      };
  }
}

// Push dispatcher — turns events into actual sendNotification calls.
//
// For each event:
//   1. Pull every stored subscription (Stage C v1 — no reverse index;
//      iterate all subs and filter in memory. Fine while N < ~500.).
//   2. Filter to subscriptions whose `follows` includes either team
//      mentioned in the event.
//   3. Further filter by preset (preset-matcher).
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
import { claimDelivery } from "./dedupe";
import {
  listSubscriptions,
  removeSubscription,
  upsertSubscription,
  type StoredSubscription,
} from "./subscription-store";
import type { PushEvent } from "./event-detector";

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

  const subs = await listSubscriptions();
  if (subs.length === 0) return { deliveries: [], pruned: 0 };

  const deliveries: DeliveryResult[] = [];
  let pruned = 0;
  const webpush = getWebPush();

  for (const event of events) {
    const eventTag = `${event.gameId}:${event.type}`;
    const matching = subs.filter((s) => subscriptionWantsEvent(s, event));

    for (const sub of matching) {
      const claimed = await claimDelivery(eventTag, sub.endpoint);
      if (!claimed) {
        deliveries.push({
          endpoint: sub.endpoint,
          delivered: false,
          reason: "deduped",
        });
        continue;
      }

      const payload = buildPayload(event, sub.noSpoilers);
      let encoded: string;
      try {
        encoded = encodePushPayload(payload);
      } catch (err) {
        deliveries.push({
          endpoint: sub.endpoint,
          delivered: false,
          reason: err instanceof Error ? err.message : "payload-too-large",
        });
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
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(sub.endpoint);
          pruned += 1;
          deliveries.push({
            endpoint: sub.endpoint,
            delivered: false,
            reason: "gone",
          });
        } else {
          deliveries.push({
            endpoint: sub.endpoint,
            delivered: false,
            reason: `push-failed-${statusCode ?? "?"}`,
          });
        }
      }
    }
  }

  return { deliveries, pruned };
}

/** Events whose copy reveals closeness or comeback drama. These get
 *  suppressed for subscriptions where noSpoilers is true, even if the
 *  user picked the "All moments" tier — they opted into both, both
 *  should be respected. (Codex QA #1.) */
const SPOILERY_EVENTS = new Set<PushEvent["type"]>(["close-game"]);

function subscriptionWantsEvent(
  sub: StoredSubscription,
  event: PushEvent
): boolean {
  // Defensive: old Stage B rows can be missing follows/alertPreset
  // entirely. The store normalizer fills them in now (Codex QA #2),
  // but belt-and-suspenders.
  const preset = sub.alertPreset ?? "companion";
  const follows = Array.isArray(sub.follows) ? sub.follows : [];

  if (!presetMatchesEvent(preset, event.type)) return false;

  // No-Spoilers gate. The user explicitly opted into hiding closeness
  // across the entire app — push notifications must honor that too.
  if (sub.noSpoilers && SPOILERY_EVENTS.has(event.type)) return false;

  // The user is "interested" if any of their team-kind follows matches
  // either side of the matchup. Country / series / tournament follows
  // don't drive NBA push fanout (yet — those exist for WC and future).
  return follows.some(
    (f) =>
      f.kind === "team" && (f.id === event.awayCode || f.id === event.homeCode)
  );
}

/** Format the score line for push bodies. Matches the canonical
 *  Stadium Panel format used in the SevenDotStrip detail card and the
 *  series-data adapter: "AWAY awayScore – homeScore HOME". */
function scoreLine(event: PushEvent): string {
  return `${event.awayCode} ${event.awayScore} – ${event.homeScore} ${event.homeCode}`;
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
    case "final":
      return {
        title: `Final · ${matchup}`,
        body: noSpoilers ? "Game's done. Tap when you're ready." : scoreLine(event),
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:final`,
      };
  }
}

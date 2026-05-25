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

      const payload = buildPayload(event);
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

function subscriptionWantsEvent(
  sub: StoredSubscription,
  event: PushEvent
): boolean {
  if (!presetMatchesEvent(sub.alertPreset, event.type)) return false;
  // The user is "interested" if any of their team-kind follows matches
  // either side of the matchup. Country / series / tournament follows
  // don't drive NBA push fanout (yet — those exist for WC and future).
  return sub.follows.some(
    (f) =>
      f.kind === "team" && (f.id === event.awayCode || f.id === event.homeCode)
  );
}

function buildPayload(event: PushEvent): PushPayload {
  const matchup = `${event.awayCode} vs ${event.homeCode}`;
  // Copy contract: never lead with the score. The body says what
  // happened in human terms; the user taps in for numbers.
  switch (event.type) {
    case "tipoff":
      return {
        title: `Tipoff · ${matchup}`,
        body: "Game's underway. Tap to follow along.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:tipoff`,
      };
    case "eoq-1":
      return {
        title: `End of Q1 · ${matchup}`,
        body: "Quarter wrapped. Tap to check in.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "eoq-2":
      return {
        title: `Halftime · ${matchup}`,
        body: "Half done. Tap to check in.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "eoq-3":
      return {
        title: `End of Q3 · ${matchup}`,
        body: "One quarter left.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:eoq`,
      };
    case "close-game":
      return {
        title: `Q4 · ${matchup}`,
        body: "One-possession game in the final minutes.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:close`,
      };
    case "final":
      return {
        title: `Final · ${matchup}`,
        body: "Game's done. Tap when you're ready.",
        url: `/game/${event.gameId}`,
        tag: `${event.gameId}:final`,
      };
  }
}

// Push subscription store — Stage B placeholder.
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  THIS IS AN IN-MEMORY MODULE-LEVEL STORE.                        │
// │                                                                  │
// │  It works for:                                                   │
// │    • Local dev (one Next.js process)                             │
// │    • Single-instance deployments that never restart              │
// │                                                                  │
// │  It DOES NOT work for:                                           │
// │    • Vercel serverless (each invocation gets a fresh module)     │
// │    • Multi-region / multi-instance production                    │
// │    • Anything that needs to survive a deploy                     │
// │                                                                  │
// │  Production replacement: swap the body of these functions to     │
// │  read/write Vercel KV / Upstash / Postgres / DynamoDB / etc.     │
// │  The function signatures are intentionally narrow so the swap    │
// │  is a one-file edit.                                             │
// └──────────────────────────────────────────────────────────────────┘
//
// The frontend ALSO persists its own subscription in localStorage and
// re-POSTs it on every reload, so even with the server's store wiped,
// active users self-restore on their next open. This is the only reason
// the in-memory store is acceptable as a temporary stop-gap.

import type { PushSubscriptionJSON } from "../push/web-push-types";

export type StoredSubscription = {
  /** Push service endpoint URL — the unique identifier. */
  endpoint: string;
  /** ECDH/auth keys for the encrypted payload. */
  keys: { p256dh: string; auth: string };
  /** When the device first registered. */
  createdAt: number;
  /** Last time we successfully delivered (or attempted) a push. */
  lastSeenAt: number;
};

// Module-scope map. Survives across requests on a single Node process.
// Keyed by endpoint URL because that's globally unique.
const store = new Map<string, StoredSubscription>();

export function upsertSubscription(sub: PushSubscriptionJSON): StoredSubscription {
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error("Invalid subscription — missing endpoint or keys.");
  }
  const existing = store.get(sub.endpoint);
  const now = Date.now();
  const next: StoredSubscription = existing
    ? { ...existing, lastSeenAt: now }
    : {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        createdAt: now,
        lastSeenAt: now,
      };
  store.set(sub.endpoint, next);
  return next;
}

export function removeSubscription(endpoint: string): boolean {
  return store.delete(endpoint);
}

export function getSubscription(endpoint: string): StoredSubscription | undefined {
  return store.get(endpoint);
}

export function listSubscriptions(): StoredSubscription[] {
  return Array.from(store.values());
}

export function subscriptionCount(): number {
  return store.size;
}

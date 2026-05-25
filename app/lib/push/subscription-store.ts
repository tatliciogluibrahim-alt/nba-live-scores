// Durable Push subscription store.
//
// Backed by Vercel KV / Upstash Redis so subscriptions survive serverless
// cold starts, deploys, and multi-region execution. The exported helper
// names intentionally match the Stage B in-memory store; callers only need
// to await the now-durable operations.

import { createHash } from "node:crypto";
import { kv } from "@vercel/kv";
import type { ValidPushSubscription } from "./subscription-validation";
import type { SyncedFollow, ValidSyncPayload } from "./sync-validation";
import type { AlertPreset } from "../../companion/state/types";

export type StoredSubscription = {
  /** Push service endpoint URL — the unique identifier. */
  endpoint: string;
  /** ECDH/auth keys for the encrypted payload. */
  keys: { p256dh: string; auth: string };
  /** Follows snapshot — what teams/series/countries this device cares
   *  about. Updated whenever the client re-syncs. */
  follows: SyncedFollow[];
  /** Global notification tier — quiet/companion/all. */
  alertPreset: AlertPreset;
  /** No-Spoilers mode flag from prefs. When true, the dispatcher
   *  suppresses any event whose copy leaks closeness (close-game,
   *  comeback) so the user's No-Spoilers contract holds even on the
   *  "All moments" tier. */
  noSpoilers: boolean;
  /** When the device first registered. */
  createdAt: number;
  /** Last time we successfully delivered (or attempted) a push. */
  lastSeenAt: number;
};

const SUBSCRIPTION_INDEX_KEY = "nns:push:subscriptions:v1";
const SUBSCRIPTION_KEY_PREFIX = "nns:push:subscription:v1:";

function subscriptionKey(endpoint: string): string {
  const hash = createHash("sha256").update(endpoint).digest("hex");
  return `${SUBSCRIPTION_KEY_PREFIX}${hash}`;
}

/** Defensive normalizer for rows pulled from KV. Old Stage B rows may
 *  lack `follows`, `alertPreset`, or `noSpoilers` entirely — every
 *  consumer downstream assumes these fields exist. Without this, the
 *  dispatcher crashes on `.some()` against undefined. (Codex QA #2). */
function normalizeStored(
  endpoint: string,
  row: Partial<StoredSubscription> | null | undefined
): StoredSubscription | null {
  if (!row || !row.keys?.p256dh || !row.keys?.auth) return null;
  return {
    endpoint: row.endpoint ?? endpoint,
    keys: { p256dh: row.keys.p256dh, auth: row.keys.auth },
    follows: Array.isArray(row.follows) ? row.follows : [],
    alertPreset: (row.alertPreset as AlertPreset | undefined) ?? "companion",
    noSpoilers: typeof row.noSpoilers === "boolean" ? row.noSpoilers : false,
    createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
    lastSeenAt: typeof row.lastSeenAt === "number" ? row.lastSeenAt : Date.now(),
  };
}

export async function upsertSubscription(
  sub: ValidPushSubscription,
  sync?: ValidSyncPayload
): Promise<StoredSubscription> {
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error("Invalid subscription: missing endpoint or keys.");
  }

  const key = subscriptionKey(sub.endpoint);
  const raw = await kv.get<Partial<StoredSubscription>>(key);
  const existing = normalizeStored(sub.endpoint, raw);
  const now = Date.now();
  // If the caller supplied a sync payload (subscribe / sync calls), use
  // it. Otherwise preserve whatever was there (test endpoint, dispatcher
  // refresh after delivery, etc).
  const follows = sync ? sync.follows : existing?.follows ?? [];
  const alertPreset = sync ? sync.alertPreset : existing?.alertPreset ?? "companion";
  const noSpoilers = sync
    ? sync.noSpoilers
    : existing?.noSpoilers ?? false;
  const next: StoredSubscription = existing
    ? {
        ...existing,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        follows,
        alertPreset,
        noSpoilers,
        lastSeenAt: now,
      }
    : {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        follows,
        alertPreset,
        noSpoilers,
        createdAt: now,
        lastSeenAt: now,
      };

  await Promise.all([
    kv.set(key, next),
    kv.sadd(SUBSCRIPTION_INDEX_KEY, sub.endpoint),
  ]);

  return next;
}

export async function removeSubscription(endpoint: string): Promise<boolean> {
  const [deleted] = await Promise.all([
    kv.del(subscriptionKey(endpoint)),
    kv.srem(SUBSCRIPTION_INDEX_KEY, endpoint),
  ]);
  return deleted > 0;
}

export async function getSubscription(
  endpoint: string
): Promise<StoredSubscription | undefined> {
  const raw = await kv.get<Partial<StoredSubscription>>(subscriptionKey(endpoint));
  return normalizeStored(endpoint, raw) ?? undefined;
}

export async function listSubscriptions(): Promise<StoredSubscription[]> {
  const endpoints = await kv.smembers<string[]>(SUBSCRIPTION_INDEX_KEY);
  const rows = await Promise.all(endpoints.map((endpoint) => getSubscription(endpoint)));
  return rows.filter((row): row is StoredSubscription => Boolean(row));
}

export async function subscriptionCount(): Promise<number> {
  return kv.scard(SUBSCRIPTION_INDEX_KEY);
}

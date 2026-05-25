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
// Reverse index: for each followed team abbr, a set of endpoint URLs
// that follow it. Lets the dispatcher fanout selectively instead of
// iterating every subscription on every event. (Phase 2.4)
const TEAM_INDEX_KEY_PREFIX = "nns:push:by-team:v1:";

function subscriptionKey(endpoint: string): string {
  const hash = createHash("sha256").update(endpoint).digest("hex");
  return `${SUBSCRIPTION_KEY_PREFIX}${hash}`;
}

function teamIndexKey(teamCode: string): string {
  return `${TEAM_INDEX_KEY_PREFIX}${teamCode.toUpperCase()}`;
}

/** Diff old vs new follows, return added/removed team codes. Used to
 *  surgically update the reverse index instead of rebuilding it. */
function teamFollowDiff(
  oldFollows: ReadonlyArray<SyncedFollow>,
  newFollows: ReadonlyArray<SyncedFollow>
): { added: string[]; removed: string[] } {
  const oldTeams = new Set(
    oldFollows.filter((f) => f.kind === "team").map((f) => f.id.toUpperCase())
  );
  const newTeams = new Set(
    newFollows.filter((f) => f.kind === "team").map((f) => f.id.toUpperCase())
  );
  const added: string[] = [];
  const removed: string[] = [];
  for (const t of newTeams) if (!oldTeams.has(t)) added.push(t);
  for (const t of oldTeams) if (!newTeams.has(t)) removed.push(t);
  return { added, removed };
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

  // Reverse-index maintenance: diff old vs new team follows and apply
  // surgical adds/removes. Skipped if this upsert didn't carry a sync
  // payload (e.g. dispatcher post-delivery refresh) since `follows`
  // hasn't changed.
  const indexOps: Promise<unknown>[] = [
    kv.set(key, next),
    kv.sadd(SUBSCRIPTION_INDEX_KEY, sub.endpoint),
  ];
  if (sync) {
    const { added, removed } = teamFollowDiff(
      existing?.follows ?? [],
      follows
    );
    for (const team of added) {
      indexOps.push(kv.sadd(teamIndexKey(team), sub.endpoint));
    }
    for (const team of removed) {
      indexOps.push(kv.srem(teamIndexKey(team), sub.endpoint));
    }
  }
  await Promise.all(indexOps);

  return next;
}

export async function removeSubscription(endpoint: string): Promise<boolean> {
  // We don't know which team indexes to clean without first loading
  // the row — do that, then clean up everything in one pass.
  const raw = await kv.get<Partial<StoredSubscription>>(subscriptionKey(endpoint));
  const existing = normalizeStored(endpoint, raw);
  const teamCleanup: Promise<unknown>[] = [];
  if (existing) {
    for (const f of existing.follows) {
      if (f.kind === "team") {
        teamCleanup.push(kv.srem(teamIndexKey(f.id), endpoint));
      }
    }
  }
  const [deleted] = await Promise.all([
    kv.del(subscriptionKey(endpoint)),
    kv.srem(SUBSCRIPTION_INDEX_KEY, endpoint),
    ...teamCleanup,
  ]);
  return deleted > 0;
}

/** Pull only the subscriptions that follow the given team codes.
 *  Phase 2.4: the dispatcher uses this instead of listSubscriptions()
 *  so fanout cost is O(interested subs) not O(all subs). */
export async function listSubscriptionsByTeams(
  teamCodes: string[]
): Promise<StoredSubscription[]> {
  if (teamCodes.length === 0) return [];
  // Union the per-team endpoint sets, then load each subscription once.
  const endpointSets = await Promise.all(
    teamCodes.map((t) => kv.smembers<string[]>(teamIndexKey(t)))
  );
  const endpointSet = new Set<string>();
  for (const set of endpointSets) {
    for (const e of set) endpointSet.add(e);
  }
  const endpoints = Array.from(endpointSet);
  if (endpoints.length === 0) return [];
  const rows = await Promise.all(endpoints.map((e) => getSubscription(e)));
  return rows.filter((r): r is StoredSubscription => Boolean(r));
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

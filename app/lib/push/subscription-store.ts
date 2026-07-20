// Durable Push subscription store.
//
// Backed by Vercel KV / Upstash Redis so subscriptions survive serverless
// cold starts, deploys, and multi-region execution. The exported helper
// names intentionally match the Stage B in-memory store; callers only need
// to await the now-durable operations.

import { createHash } from "node:crypto";
import { kv } from "@vercel/kv";
import type { ValidPushSubscription } from "./subscription-validation";
import {
  preserveSelectiveSpoilers,
  type SyncedAlert,
  type SyncedFollow,
  type ValidSyncPayload,
} from "./sync-validation";
import type { AlertPreset } from "../../companion/state/types";

export type StoredSubscription = {
  /** Push service endpoint URL — the unique identifier. */
  endpoint: string;
  /** ECDH/auth keys for the encrypted payload. */
  keys: { p256dh: string; auth: string };
  /** Alert-enabled follows snapshot. Visible-only follows are intentionally
   *  omitted so backend fanout cost tracks the slot model directly. */
  alerts: SyncedAlert[];
  /** Selective-hide follows without an alert slot. Hidden alert-enabled
   * follows carry the marker inline in `alerts`, so identities are unique. */
  spoilerFollows: SyncedFollow[];
  /** @deprecated Stage C shape. Kept optional for KV row normalization. */
  follows?: SyncedFollow[];
  /** @deprecated Stage C shape. Kept optional for KV row normalization. */
  alertPreset?: AlertPreset;
  /** No-Spoilers mode flag from prefs. When true, the dispatcher
   *  suppresses any event whose copy leaks closeness (close-game,
   *  comeback) so the user's No-Spoilers contract holds even on the
   *  "Full Details" tier. */
  noSpoilers: boolean;
  /** Optional Quiet Hours window. When set (with timeZone), the
   *  dispatcher + reminders cron skip delivery during it. */
  quietHours?: { start: string; end: string };
  /** Optional pre-game reminder lead time (minutes). */
  remindBeforeMinutes?: number;
  /** Optional device IANA time zone — needed to evaluate quietHours. */
  timeZone?: string;
  /** When the device first registered. */
  createdAt: number;
  /** Last time we successfully delivered (or attempted) a push. */
  lastSeenAt: number;
};

const SUBSCRIPTION_INDEX_KEY = "nns:push:subscriptions:v1";
const SUBSCRIPTION_KEY_PREFIX = "nns:push:subscription:v1:";
// Separate per-endpoint "liveness" key, written by the dispatcher
// after a successful delivery. This used to be part of the full
// subscription record, which made the dispatcher's post-delivery
// refresh into a read-modify-write race against concurrent user
// sync writes (a user could toggle an alert off, get pinged anyway
// when the dispatcher's stale read overwrote the new alerts). Split
// into its own key so the dispatcher's "alive" signal touches only
// itself and never overwrites alert state. Value is the unix-ms
// timestamp as a number.
const SUBSCRIPTION_LAST_SEEN_KEY_PREFIX = "nns:push:sub:lastseen:v1:";
// Reverse index: per team abbreviation, the set of endpoint URLs whose
// alerts include that team. Originally built in Phase 2.4 to let the
// dispatcher fanout selectively (only the team's followers) instead of
// iterating every subscription.
//
// As of Phase 8b the dispatcher iterates all subscriptions because the
// matcher now spans four follow kinds (team / country / series /
// tournament) — a team-only index would silently drop legitimate
// series and tournament matches. The index is kept maintained on every
// upsertSubscription() because the admin status endpoint reads it for
// the `?team=NYK` diagnostic, which was crucial in finding the NY→NYK
// alias bug. Cost per upsert is small and the diagnostic value is
// high. Remove when the moment+scope refactor lands a smarter index
// across all kinds.
const TEAM_INDEX_KEY_PREFIX = "nns:push:by-team:v1:";

function subscriptionKey(endpoint: string): string {
  const hash = createHash("sha256").update(endpoint).digest("hex");
  return `${SUBSCRIPTION_KEY_PREFIX}${hash}`;
}

function teamIndexKey(teamCode: string): string {
  return `${TEAM_INDEX_KEY_PREFIX}${teamCode.toUpperCase()}`;
}

function lastSeenKey(endpoint: string): string {
  const hash = createHash("sha256").update(endpoint).digest("hex");
  return `${SUBSCRIPTION_LAST_SEEN_KEY_PREFIX}${hash}`;
}

/** Lightweight "alive" stamp. Writes a single timestamp to a
 *  per-endpoint key that lives outside the main subscription record.
 *  Safe to call from the dispatcher's per-delivery hot path — it can
 *  never race with concurrent user sync writes because it doesn't
 *  read the subscription at all. Best-effort: silently swallows KV
 *  errors so a metrics-only stamp can't break a successful delivery.
 */
export async function touchSubscriptionLastSeen(
  endpoint: string
): Promise<void> {
  try {
    await kv.set(lastSeenKey(endpoint), Date.now());
  } catch (err) {
    console.warn("touchSubscriptionLastSeen failed", {
      err: err instanceof Error ? err.message : "unknown",
    });
  }
}

/** Diff old vs new alerts, return added/removed team codes. Used to
 *  surgically update the reverse index instead of rebuilding it. */
function teamFollowDiff(
  oldAlerts: ReadonlyArray<SyncedAlert>,
  newAlerts: ReadonlyArray<SyncedAlert>
): { added: string[]; removed: string[] } {
  const oldTeams = new Set(
    oldAlerts.filter((f) => f.scope === "team").map((f) => (f.scopeId ?? "").toUpperCase())
  );
  const newTeams = new Set(
    newAlerts.filter((f) => f.scope === "team").map((f) => (f.scopeId ?? "").toUpperCase())
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
  const legacyPreset = (row.alertPreset as AlertPreset | undefined) ?? "companion";
  const alerts = Array.isArray(row.alerts)
    ? row.alerts
    : Array.isArray(row.follows)
      ? row.follows.map((f) => ({ ...f, tier: legacyPreset }))
      : [];
  return {
    endpoint: row.endpoint ?? endpoint,
    keys: { p256dh: row.keys.p256dh, auth: row.keys.auth },
    alerts,
    spoilerFollows: Array.isArray(row.spoilerFollows)
      ? row.spoilerFollows
      : [],
    follows: Array.isArray(row.follows) ? row.follows : undefined,
    alertPreset: row.alertPreset,
    noSpoilers: typeof row.noSpoilers === "boolean" ? row.noSpoilers : false,
    quietHours: row.quietHours,
    remindBeforeMinutes:
      typeof row.remindBeforeMinutes === "number"
        ? row.remindBeforeMinutes
        : undefined,
    timeZone: typeof row.timeZone === "string" ? row.timeZone : undefined,
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
  const incomingAlerts = sync?.alertsProvided
    ? sync.alerts
    : existing?.alerts ?? [];
  const selective =
    sync?.selectiveSpoilersProvided
      ? { alerts: incomingAlerts, spoilerFollows: sync.spoilerFollows }
      : preserveSelectiveSpoilers(
          incomingAlerts,
          existing?.alerts ?? [],
          existing?.spoilerFollows ?? []
        );
  const alerts = selective.alerts;
  const spoilerFollows = selective.spoilerFollows;
  const noSpoilers = sync?.noSpoilersProvided
    ? sync.noSpoilers
    : existing?.noSpoilers ?? false;
  // Quiet-hours / reminder / tz prefs travel with the sync payload.
  // When this upsert carries no sync (e.g. the dispatcher's post-delivery
  // lastSeenAt refresh), preserve whatever was stored.
  const quietHours = sync ? sync.quietHours : existing?.quietHours;
  const remindBeforeMinutes = sync
    ? sync.remindBeforeMinutes
    : existing?.remindBeforeMinutes;
  const timeZone = sync ? sync.timeZone : existing?.timeZone;
  const next: StoredSubscription = existing
    ? {
        ...existing,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        alerts,
        spoilerFollows,
        noSpoilers,
        quietHours,
        remindBeforeMinutes,
        timeZone,
        lastSeenAt: now,
      }
    : {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        alerts,
        spoilerFollows,
        noSpoilers,
        quietHours,
        remindBeforeMinutes,
        timeZone,
        createdAt: now,
        lastSeenAt: now,
      };

  // Reverse-index maintenance: diff old vs new team alerts and apply
  // surgical adds/removes. Skipped if this upsert didn't carry a sync
  // payload (e.g. dispatcher post-delivery refresh) since `alerts`
  // hasn't changed.
  const indexOps: Promise<unknown>[] = [
    kv.set(key, next),
    kv.sadd(SUBSCRIPTION_INDEX_KEY, sub.endpoint),
  ];
  if (sync) {
    const { added, removed } = teamFollowDiff(
      existing?.alerts ?? [],
      alerts
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
    for (const f of existing.alerts) {
      if (f.scope === "team" && f.scopeId) {
        teamCleanup.push(kv.srem(teamIndexKey(f.scopeId), endpoint));
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

/** Pull only the subscriptions that have alerts for the given team codes.
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

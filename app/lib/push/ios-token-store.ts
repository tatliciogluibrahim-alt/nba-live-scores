// iOS APNs device token store.
//
// Phase 22.5-2: extended from a flat set of tokens to a full
// per-token record so the dispatcher can match events the same way
// it does for web push subscriptions. Same data shape downstream —
// just a different transport.
//
// Storage layout (mirrors subscription-store.ts):
//   • KV set `nns:ios:tokens:v2` — list of all registered tokens
//   • KV hash `nns:ios:token:v2:<token>` — the full StoredIosToken
//
// Backward compatibility: the old `nns:ios:tokens` flat set from
// the Phase 22.5-1 proof-of-life is still read on first call so
// tokens registered during the proof don't disappear. They get
// upgraded to the new shape on their next register call (which
// happens automatically every time CapacitorPushBootstrap mounts).
//
// We don't use a reverse index (per-team / per-country) here because
// the iOS token population stays small for a long while — friend
// beta scale, eventually maybe a few thousand. A linear iteration
// across all tokens at dispatch time is cheap and stays correct
// regardless of follow kind. Mirrors what the web dispatcher does
// for the same reason (see dispatcher.ts comments).

import { kv } from "@vercel/kv";
import type { SyncedAlert } from "./sync-validation";

export type StoredIosToken = {
  /** APNs hex device token — opaque to us. */
  token: string;
  /** Alert-enabled follows snapshot, same shape as web push. */
  alerts: SyncedAlert[];
  /** No-Spoilers mode flag. Dispatcher uses this to suppress
   *  closeness-revealing events (close-game, comeback) and to swap
   *  push bodies for safe variants. */
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
  /** Last update to the alerts / noSpoilers fields. */
  updatedAt: number;
  /** Last time we attempted (successfully or not) a push to this
   *  token. Helps us prune tokens that haven't been touched in a
   *  long time during a future maintenance sweep. */
  lastSeenAt: number;
};

const TOKEN_INDEX_KEY = "nns:ios:tokens:v2";
const TOKEN_KEY_PREFIX = "nns:ios:token:v2:";

// Legacy keys from the Phase 22.5-1 proof-of-life. Tokens registered
// before the schema extended live in this set with no alerts /
// noSpoilers metadata. On read they get returned with empty alerts
// (which means they won't match any event) — they upgrade to v2
// the next time the device hits register-ios.
const LEGACY_TOKEN_SET_KEY = "nns:ios:tokens";

function tokenKey(token: string): string {
  return `${TOKEN_KEY_PREFIX}${token}`;
}

function normalizeStored(
  token: string,
  raw: Partial<StoredIosToken> | null | undefined
): StoredIosToken | null {
  if (!raw) return null;
  const now = Date.now();
  return {
    token: raw.token ?? token,
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    noSpoilers: typeof raw.noSpoilers === "boolean" ? raw.noSpoilers : false,
    quietHours: raw.quietHours,
    remindBeforeMinutes:
      typeof raw.remindBeforeMinutes === "number"
        ? raw.remindBeforeMinutes
        : undefined,
    timeZone: typeof raw.timeZone === "string" ? raw.timeZone : undefined,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    lastSeenAt: typeof raw.lastSeenAt === "number" ? raw.lastSeenAt : now,
  };
}

/** Upsert an iOS token's full record. If alerts/noSpoilers are
 *  provided, the device's sync state is persisted; otherwise an
 *  existing record is preserved as-is. */
export async function upsertIosToken(input: {
  token: string;
  alerts?: SyncedAlert[];
  noSpoilers?: boolean;
  quietHours?: { start: string; end: string };
  remindBeforeMinutes?: number;
  timeZone?: string;
}): Promise<StoredIosToken> {
  const { token } = input;
  const key = tokenKey(token);
  const raw = await kv.get<Partial<StoredIosToken>>(key);
  const existing = normalizeStored(token, raw);
  const now = Date.now();

  // A sync-bearing register call carries `alerts`; treat that as the
  // signal that the device sent its full prefs, so quietHours / reminder
  // / tz are taken from the input (even when undefined = "cleared").
  // A bare touch (no alerts) preserves the stored prefs.
  const syncing = input.alerts !== undefined;
  const alerts = syncing ? input.alerts! : existing?.alerts ?? [];
  const noSpoilers =
    input.noSpoilers !== undefined
      ? input.noSpoilers
      : existing?.noSpoilers ?? false;
  const quietHours = syncing ? input.quietHours : existing?.quietHours;
  const remindBeforeMinutes = syncing
    ? input.remindBeforeMinutes
    : existing?.remindBeforeMinutes;
  const timeZone = syncing ? input.timeZone : existing?.timeZone;

  const next: StoredIosToken = existing
    ? {
        ...existing,
        alerts,
        noSpoilers,
        quietHours,
        remindBeforeMinutes,
        timeZone,
        updatedAt:
          input.alerts !== undefined || input.noSpoilers !== undefined
            ? now
            : existing.updatedAt,
        lastSeenAt: now,
      }
    : {
        token,
        alerts,
        noSpoilers,
        quietHours,
        remindBeforeMinutes,
        timeZone,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      };

  await Promise.all([kv.set(key, next), kv.sadd(TOKEN_INDEX_KEY, token)]);
  return next;
}

/** Touch lastSeenAt without changing alerts/noSpoilers. The
 *  dispatcher calls this after every successful delivery. */
export async function touchIosToken(token: string): Promise<void> {
  const key = tokenKey(token);
  const raw = await kv.get<Partial<StoredIosToken>>(key);
  const existing = normalizeStored(token, raw);
  if (!existing) return;
  await kv.set(key, { ...existing, lastSeenAt: Date.now() });
}

/** Remove a token entirely. Used when APNs returns 410 Unregistered
 *  (token has been invalidated — app uninstalled, token rotated, etc.). */
export async function removeIosToken(token: string): Promise<void> {
  await Promise.all([
    kv.del(tokenKey(token)),
    kv.srem(TOKEN_INDEX_KEY, token),
    // Also clean up from the legacy set so old proof-of-life entries
    // don't keep coming back across sweeps.
    kv.srem(LEGACY_TOKEN_SET_KEY, token),
  ]);
}

/** List all registered iOS tokens with their alert state. The
 *  dispatcher iterates this for every event batch. */
export async function listIosTokens(): Promise<StoredIosToken[]> {
  // Read from both the new v2 index and the legacy set. Tokens that
  // appear in both (proof-of-life tokens that have since upgraded)
  // dedupe via the Map.
  const [v2Tokens, legacyTokens] = await Promise.all([
    kv.smembers<string[]>(TOKEN_INDEX_KEY),
    kv.smembers<string[]>(LEGACY_TOKEN_SET_KEY),
  ]);

  const allTokens = new Set<string>([...v2Tokens, ...legacyTokens]);
  if (allTokens.size === 0) return [];

  const rows = await Promise.all(
    Array.from(allTokens).map(async (token) => {
      const raw = await kv.get<Partial<StoredIosToken>>(tokenKey(token));
      const normalized = normalizeStored(token, raw);
      if (normalized) return normalized;
      // Legacy-only entry with no v2 record — return a stub so it's
      // visible to the dispatcher but won't match any event (empty
      // alerts). It'll get upgraded next time the device re-registers.
      const now = Date.now();
      return {
        token,
        alerts: [],
        noSpoilers: false,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      } satisfies StoredIosToken;
    })
  );

  return rows;
}

/** Count of registered iOS tokens. Reads both v2 and legacy. */
export async function countIosTokens(): Promise<number> {
  const [v2, legacy] = await Promise.all([
    kv.scard(TOKEN_INDEX_KEY),
    kv.scard(LEGACY_TOKEN_SET_KEY),
  ]);
  // Approximate — doesn't dedupe across the two sets, but a token
  // that appears in both is rare (only during the transition window)
  // and the overcount is harmless for diagnostic use.
  return (v2 ?? 0) + (legacy ?? 0);
}


// Validation for the alert sync payload sent alongside a subscription.
// Stage 17: the dispatcher cares only about alert-enabled follows and
// each follow owns its own tier.

import type { AlertPreset, ScopeKind } from "../../companion/state/types";
import { canonicalSyncIdentity } from "../../companion/state/follow-migration";

/** Canonical follow identity on the wire (Path B). The validator also
 *  accepts the legacy {kind, id} shape — old stored KV records and
 *  not-yet-refreshed clients migrate through canonicalSyncIdentity. */
export type SyncedFollow = {
  momentId: string;
  scope: ScopeKind;
  scopeId: string | null;
};

export type SyncedAlert = SyncedFollow & {
  tier: AlertPreset;
  /** Selective No-Spoilers marker. Only valid for team/country/series.
   * Alert-enabled hidden follows carry this inline to avoid sending the
   * same identity again in `spoilerFollows`. */
  hideSpoilers?: true;
};

// ── Stored-row migration (read seam) ─────────────────────────────────
// canonicalSyncIdentity migrates legacy {kind, id} rows when a device
// SYNCS — but devices that never re-synced after Path B (2026-07-19) still
// hold legacy rows in KV, and both stores passed them to the dispatcher
// raw. One such row crashed the whole dispatch batch (momentId undefined).
// These run at every store read so rows-at-rest match again without
// waiting for the device to reopen the app. Unplaceable rows drop.

const VALID_TIERS = new Set<AlertPreset>(["quiet", "companion", "all"]);

export function migrateStoredFollows(raw: unknown): SyncedFollow[] {
  if (!Array.isArray(raw)) return [];
  const out: SyncedFollow[] = [];
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue;
    const canon = canonicalSyncIdentity(row as Record<string, unknown>);
    if (canon) out.push(canon);
  }
  return out;
}

export function migrateStoredAlerts(
  raw: unknown,
  fallbackTier: AlertPreset = "companion"
): SyncedAlert[] {
  if (!Array.isArray(raw)) return [];
  const out: SyncedAlert[] = [];
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const canon = canonicalSyncIdentity(r);
    if (!canon) continue;
    const tier = VALID_TIERS.has(r.tier as AlertPreset)
      ? (r.tier as AlertPreset)
      : fallbackTier;
    out.push({
      ...canon,
      tier,
      ...(r.hideSpoilers === true ? { hideSpoilers: true as const } : {}),
    });
  }
  return out;
}

export type ValidSyncPayload = {
  alerts: SyncedAlert[];
  /** False for legacy/touch payloads that did not send an alert snapshot. */
  alertsProvided: boolean;
  /** Selective-hide follows that do not have an alert slot. Membership
   * implies hideSpoilers=true. Whole-moment ("all") is intentionally
   * unsupported — the free global toggle is how you hide a tournament. */
  spoilerFollows: SyncedFollow[];
  /** An explicit array, including [], is authoritative. When absent, stores
   * preserve older selective choices instead of erasing them during rollout. */
  selectiveSpoilersProvided: boolean;
  /** No-Spoilers mode flag. Gates closeness-leaking events at the
   *  dispatcher (close-game, comeback) — see Codex QA #1. */
  noSpoilers: boolean;
  /** Distinguishes an explicit false from a legacy payload with no flag. */
  noSpoilersProvided: boolean;
  /** Whether the device wants the lock-screen live-score offer at
   *  kickoff (iOS only). Defaults true. */
  lockScreenOffers: boolean;
  /** Optional Quiet Hours window ("HH:MM" 24h). When set (with a
   *  timeZone), the dispatcher + reminders cron suppress delivery while
   *  the device's local time is inside it. */
  quietHours?: { start: string; end: string };
  /** Optional. Minutes before tipoff the reminders cron fires a pre-game
   *  reminder. Omitted → cron uses its default (30). */
  remindBeforeMinutes?: number;
  /** Optional IANA time zone of the device (e.g. "America/New_York").
   *  Required to evaluate quietHours correctly. */
  timeZone?: string;
};

const HHMM_RE = /^(\d{1,2}):(\d{2})$/;

function parseQuietHours(
  raw: unknown
): { start: string; end: string } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const q = raw as { start?: unknown; end?: unknown };
  if (typeof q.start !== "string" || typeof q.end !== "string") return undefined;
  if (!HHMM_RE.test(q.start) || !HHMM_RE.test(q.end)) return undefined;
  return { start: q.start, end: q.end };
}

function parseRemindBeforeMinutes(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  // Clamp to a sane band; the UI offers 15 / 30 / 60.
  if (raw < 0 || raw > 180) return undefined;
  return Math.round(raw);
}

function parseTimeZone(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const tz = raw.trim();
  // IANA names are short-ish (e.g. "America/Argentina/Buenos_Aires").
  if (tz.length === 0 || tz.length > 64) return undefined;
  if (!/^[A-Za-z0-9_+\-/]+$/.test(tz)) return undefined;
  return tz;
}

const VALID_PRESETS: ReadonlySet<AlertPreset> = new Set([
  "quiet",
  "companion",
  "all",
]);

const MAX_ALERTS = 64;
const MAX_ID_LENGTH = 80;

function identityKey(f: SyncedFollow): string {
  return `${f.momentId}::${f.scope}::${f.scopeId ?? ""}`;
}

export function validateSyncPayload(input: unknown): ValidSyncPayload {
  // Empty / missing → treat as "nothing to alert about."
  // This keeps the subscribe endpoint backwards-compatible with clients
  // that POST only a subscription (no follows / preset yet).
  if (!input || typeof input !== "object") {
    return {
      alerts: [],
      alertsProvided: false,
      spoilerFollows: [],
      selectiveSpoilersProvided: false,
      noSpoilers: false,
      noSpoilersProvided: false,
      lockScreenOffers: true,
    };
  }

  const raw = input as {
    alerts?: unknown;
    spoilerFollows?: unknown;
    // Legacy Stage C payload. Converted into per-follow alerts below so
    // old clients don't break while installed PWAs roll forward.
    follows?: unknown;
    alertPreset?: unknown;
    noSpoilers?: unknown;
    lockScreenOffers?: unknown;
    quietHours?: unknown;
    remindBeforeMinutes?: unknown;
    timeZone?: unknown;
  };

  const alertPreset: AlertPreset =
    typeof raw.alertPreset === "string" &&
    VALID_PRESETS.has(raw.alertPreset as AlertPreset)
      ? (raw.alertPreset as AlertPreset)
      : "companion";

  const rawAlerts = Array.isArray(raw.alerts)
    ? raw.alerts
    : Array.isArray(raw.follows)
      ? raw.follows
      : [];
  const alertsProvided =
    Array.isArray(raw.alerts) || Array.isArray(raw.follows);
  const alerts: SyncedAlert[] = [];
  const seenAlertKeys = new Set<string>();
  for (const entry of rawAlerts.slice(0, MAX_ALERTS)) {
    if (!entry || typeof entry !== "object") continue;
    const f = entry as {
      kind?: unknown;
      id?: unknown;
      momentId?: unknown;
      scope?: unknown;
      scopeId?: unknown;
      tier?: unknown;
      hideSpoilers?: unknown;
    };
    const canon = canonicalSyncIdentity(f);
    if (!canon) continue;
    if (
      canon.momentId.length > MAX_ID_LENGTH ||
      (canon.scopeId !== null && canon.scopeId.length > MAX_ID_LENGTH)
    ) {
      continue;
    }
    const key = identityKey(canon);
    if (seenAlertKeys.has(key)) continue;
    seenAlertKeys.add(key);
    const tier: AlertPreset =
      typeof f.tier === "string" && VALID_PRESETS.has(f.tier as AlertPreset)
        ? (f.tier as AlertPreset)
        : alertPreset;
    alerts.push({
      ...canon,
      tier,
      ...(f.hideSpoilers === true && canon.scope !== "all"
        ? { hideSpoilers: true as const }
        : {}),
    });
  }

  // Only identities that are not already represented by a hidden alert
  // belong here. That keeps one follow from being stored twice while still
  // letting a visible-only follow protect notifications triggered by a
  // different alert (for example, a team hidden under a tournament alert).
  const hiddenAlertKeys = new Set(
    alerts.filter((alert) => alert.hideSpoilers).map(identityKey)
  );
  const spoilerFollows: SyncedFollow[] = [];
  const seenSpoilerKeys = new Set<string>();
  const rawSpoilerFollows = Array.isArray(raw.spoilerFollows)
    ? raw.spoilerFollows
    : [];
  const selectiveSpoilersProvided = Array.isArray(raw.spoilerFollows);
  for (const entry of rawSpoilerFollows.slice(0, MAX_ALERTS)) {
    if (!entry || typeof entry !== "object") continue;
    const canon = canonicalSyncIdentity(
      entry as { kind?: unknown; id?: unknown; momentId?: unknown; scope?: unknown; scopeId?: unknown }
    );
    // Whole-moment selective hiding is intentionally unsupported.
    if (!canon || canon.scope === "all") continue;
    if (
      canon.momentId.length > MAX_ID_LENGTH ||
      (canon.scopeId !== null && canon.scopeId.length > MAX_ID_LENGTH)
    ) {
      continue;
    }
    const key = identityKey(canon);
    if (hiddenAlertKeys.has(key) || seenSpoilerKeys.has(key)) continue;
    seenSpoilerKeys.add(key);
    spoilerFollows.push(canon);
  }

  const noSpoilers = raw.noSpoilers === true;
  const noSpoilersProvided = typeof raw.noSpoilers === "boolean";
  // Default ON: undefined/absent → true. Only an explicit false disables.
  const lockScreenOffers = raw.lockScreenOffers !== false;
  const quietHours = parseQuietHours(raw.quietHours);
  const remindBeforeMinutes = parseRemindBeforeMinutes(raw.remindBeforeMinutes);
  const timeZone = parseTimeZone(raw.timeZone);

  return {
    alerts,
    alertsProvided,
    spoilerFollows,
    selectiveSpoilersProvided,
    noSpoilers,
    noSpoilersProvided,
    lockScreenOffers,
    quietHours,
    remindBeforeMinutes,
    timeZone,
  };
}

function followKey(follow: SyncedFollow): string {
  return identityKey(follow);
}

/**
 * Merge a legacy sync snapshot with stored selective privacy. New clients
 * send `spoilerFollows` explicitly (even when empty) and bypass this helper.
 * Old clients can still change alert tiers without erasing hidden follows.
 */
export function preserveSelectiveSpoilers(
  incomingAlerts: readonly SyncedAlert[],
  existingAlerts: readonly SyncedAlert[],
  existingSpoilerFollows: readonly SyncedFollow[]
): { alerts: SyncedAlert[]; spoilerFollows: SyncedFollow[] } {
  const identityOf = (f: SyncedFollow): SyncedFollow => ({
    momentId: f.momentId,
    scope: f.scope,
    scopeId: f.scopeId,
  });
  const hidden = new Map<string, SyncedFollow>();
  for (const alert of existingAlerts) {
    if (alert.hideSpoilers && alert.scope !== "all") {
      hidden.set(followKey(alert), identityOf(alert));
    }
  }
  for (const follow of existingSpoilerFollows) {
    if (follow.scope !== "all") hidden.set(followKey(follow), follow);
  }
  // A transitional client may carry the inline flag but not the separate
  // array. Treat that as an additional hidden identity, never a reset.
  for (const alert of incomingAlerts) {
    if (alert.hideSpoilers && alert.scope !== "all") {
      hidden.set(followKey(alert), identityOf(alert));
    }
  }

  const incomingKeys = new Set(incomingAlerts.map(followKey));
  const alerts = incomingAlerts.map((alert) =>
    alert.scope !== "all" && hidden.has(followKey(alert))
      ? { ...alert, hideSpoilers: true as const }
      : alert
  );
  const spoilerFollows = Array.from(hidden.entries())
    .filter(([key]) => !incomingKeys.has(key))
    .map(([, follow]) => follow);
  return { alerts, spoilerFollows };
}

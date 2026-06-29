// Validation for the alert sync payload sent alongside a subscription.
// Stage 17: the dispatcher cares only about alert-enabled follows and
// each follow owns its own tier.

import type { AlertPreset, FollowKind } from "../../companion/state/types";

export type SyncedFollow = {
  kind: FollowKind;
  id: string;
};

export type SyncedAlert = SyncedFollow & {
  tier: AlertPreset;
};

export type ValidSyncPayload = {
  alerts: SyncedAlert[];
  /** No-Spoilers mode flag. Gates closeness-leaking events at the
   *  dispatcher (close-game, comeback) — see Codex QA #1. */
  noSpoilers: boolean;
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

const VALID_KINDS: ReadonlySet<FollowKind> = new Set([
  "team",
  "country",
  "series",
  "tournament",
]);
const VALID_PRESETS: ReadonlySet<AlertPreset> = new Set([
  "quiet",
  "companion",
  "all",
]);

const MAX_ALERTS = 64;
const MAX_ID_LENGTH = 80;

export function validateSyncPayload(input: unknown): ValidSyncPayload {
  // Empty / missing → treat as "nothing to alert about."
  // This keeps the subscribe endpoint backwards-compatible with clients
  // that POST only a subscription (no follows / preset yet).
  if (!input || typeof input !== "object") {
    return { alerts: [], noSpoilers: false, lockScreenOffers: true };
  }

  const raw = input as {
    alerts?: unknown;
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
  const alerts: SyncedAlert[] = [];
  for (const entry of rawAlerts.slice(0, MAX_ALERTS)) {
    if (!entry || typeof entry !== "object") continue;
    const f = entry as { kind?: unknown; id?: unknown; tier?: unknown };
    if (typeof f.kind !== "string" || !VALID_KINDS.has(f.kind as FollowKind)) {
      continue;
    }
    if (typeof f.id !== "string" || f.id.length === 0 || f.id.length > MAX_ID_LENGTH) {
      continue;
    }
    const tier: AlertPreset =
      typeof f.tier === "string" && VALID_PRESETS.has(f.tier as AlertPreset)
        ? (f.tier as AlertPreset)
        : alertPreset;
    alerts.push({ kind: f.kind as FollowKind, id: f.id, tier });
  }

  const noSpoilers = raw.noSpoilers === true;
  // Default ON: undefined/absent → true. Only an explicit false disables.
  const lockScreenOffers = raw.lockScreenOffers !== false;
  const quietHours = parseQuietHours(raw.quietHours);
  const remindBeforeMinutes = parseRemindBeforeMinutes(raw.remindBeforeMinutes);
  const timeZone = parseTimeZone(raw.timeZone);

  return { alerts, noSpoilers, lockScreenOffers, quietHours, remindBeforeMinutes, timeZone };
}

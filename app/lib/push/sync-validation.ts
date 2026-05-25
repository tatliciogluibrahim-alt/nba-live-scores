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
};

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
    return { alerts: [], noSpoilers: false };
  }

  const raw = input as {
    alerts?: unknown;
    // Legacy Stage C payload. Converted into per-follow alerts below so
    // old clients don't break while installed PWAs roll forward.
    follows?: unknown;
    alertPreset?: unknown;
    noSpoilers?: unknown;
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

  return { alerts, noSpoilers };
}

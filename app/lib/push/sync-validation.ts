// Validation for the follows/preset sync payload sent alongside a
// subscription. Stage C: the dispatcher needs to know which teams a
// device cares about and at which tier, so it can fanout selectively.

import type { AlertPreset, FollowKind } from "../../companion/state/types";

export type SyncedFollow = {
  kind: FollowKind;
  id: string;
};

export type ValidSyncPayload = {
  follows: SyncedFollow[];
  alertPreset: AlertPreset;
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

const MAX_FOLLOWS = 64;
const MAX_ID_LENGTH = 80;

export function validateSyncPayload(input: unknown): ValidSyncPayload {
  // Empty / missing → treat as "nothing to alert about, default tier."
  // This keeps the subscribe endpoint backwards-compatible with clients
  // that POST only a subscription (no follows / preset yet).
  if (!input || typeof input !== "object") {
    return { follows: [], alertPreset: "companion" };
  }

  const raw = input as { follows?: unknown; alertPreset?: unknown };

  const alertPreset: AlertPreset =
    typeof raw.alertPreset === "string" &&
    VALID_PRESETS.has(raw.alertPreset as AlertPreset)
      ? (raw.alertPreset as AlertPreset)
      : "companion";

  const followsArray = Array.isArray(raw.follows) ? raw.follows : [];
  const follows: SyncedFollow[] = [];
  for (const entry of followsArray.slice(0, MAX_FOLLOWS)) {
    if (!entry || typeof entry !== "object") continue;
    const f = entry as { kind?: unknown; id?: unknown };
    if (typeof f.kind !== "string" || !VALID_KINDS.has(f.kind as FollowKind)) {
      continue;
    }
    if (typeof f.id !== "string" || f.id.length === 0 || f.id.length > MAX_ID_LENGTH) {
      continue;
    }
    follows.push({ kind: f.kind as FollowKind, id: f.id });
  }

  return { follows, alertPreset };
}

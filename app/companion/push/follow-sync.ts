import type { AlertPreset, Follow, FollowKind } from "../state/types";

/** Minimal follow identity the server needs for selective No-Spoilers. */
export type SpoilerFollowSyncItem = {
  kind: Exclude<FollowKind, "tournament">;
  id: string;
};

/** Alert state sent to the push dispatcher. A selective-hide marker lives
 * on the alert itself when possible so the same follow is not sent twice. */
export type AlertSyncItem = {
  kind: FollowKind;
  id: string;
  tier: AlertPreset;
  hideSpoilers?: true;
};

export type FollowSyncState = {
  alerts: AlertSyncItem[];
  /** Selective-hide follows without an alert slot. Alert-enabled selective
   * follows carry `hideSpoilers` in `alerts`, avoiding duplicate identities. */
  spoilerFollows: SpoilerFollowSyncItem[];
};

function canSelectivelyHide(kind: FollowKind): kind is Exclude<FollowKind, "tournament"> {
  // Whole-tournament hiding is intentionally the global No-Spoilers control.
  return kind !== "tournament";
}

/** Build the one minimal follow snapshot shared by web push and Capacitor.
 * Visible-only, non-hidden follows are omitted because the server has no use
 * for them. Creation timestamps and other local-only state never leave the
 * device. */
export function buildFollowSyncState(follows: readonly Follow[]): FollowSyncState {
  const alerts: AlertSyncItem[] = [];
  const spoilerFollows: SpoilerFollowSyncItem[] = [];

  for (const follow of follows) {
    const selectiveKind = canSelectivelyHide(follow.kind)
      ? follow.kind
      : null;
    const hideSpoilers = follow.hideSpoilers === true && selectiveKind !== null;

    if (follow.alertEnabled) {
      alerts.push({
        kind: follow.kind,
        id: follow.id,
        tier: follow.alertTier,
        ...(hideSpoilers ? { hideSpoilers: true as const } : {}),
      });
    } else if (hideSpoilers && selectiveKind) {
      spoilerFollows.push({ kind: selectiveKind, id: follow.id });
    }
  }

  return { alerts, spoilerFollows };
}

/** Stable hash fragment used by both transports. Selective-hide changes must
 * trigger a re-sync even when alert tiers and the global toggle stay put. */
export function followSyncHash(state: FollowSyncState): string {
  const alerts = state.alerts
    .map(
      (follow) =>
        `${follow.kind}:${follow.id}:${follow.tier}:${follow.hideSpoilers ? "hide" : "show"}`
    )
    .sort()
    .join(",");
  const spoilerFollows = state.spoilerFollows
    .map((follow) => `${follow.kind}:${follow.id}`)
    .sort()
    .join(",");
  return `${alerts}|selective:${spoilerFollows}`;
}

import type { AlertPreset, Follow, ScopeKind } from "../state/types";

/** Minimal follow identity the server needs for selective No-Spoilers.
 *  Canonical (Path B): moment + scope + entity — never legacy kind/id. */
export type SpoilerFollowSyncItem = {
  momentId: string;
  scope: ScopeKind;
  scopeId: string | null;
};

/** Alert state sent to the push dispatcher. A selective-hide marker lives
 * on the alert itself when possible so the same follow is not sent twice. */
export type AlertSyncItem = SpoilerFollowSyncItem & {
  tier: AlertPreset;
  hideSpoilers?: true;
};

export type FollowSyncState = {
  alerts: AlertSyncItem[];
  /** Selective-hide follows without an alert slot. Alert-enabled selective
   * follows carry `hideSpoilers` in `alerts`, avoiding duplicate identities. */
  spoilerFollows: SpoilerFollowSyncItem[];
};

function canSelectivelyHide(scope: ScopeKind): boolean {
  // Whole-moment hiding is intentionally the global No-Spoilers control.
  return scope !== "all";
}

/** Build the one minimal follow snapshot shared by web push and Capacitor.
 * Visible-only, non-hidden follows are omitted because the server has no use
 * for them. Creation timestamps and other local-only state never leave the
 * device. */
export function buildFollowSyncState(follows: readonly Follow[]): FollowSyncState {
  const alerts: AlertSyncItem[] = [];
  const spoilerFollows: SpoilerFollowSyncItem[] = [];

  for (const follow of follows) {
    const selective = canSelectivelyHide(follow.scope);
    const hideSpoilers = follow.hideSpoilers === true && selective;
    const identity = {
      momentId: follow.momentId,
      scope: follow.scope,
      scopeId: follow.scopeId,
    };

    if (follow.alertEnabled) {
      alerts.push({
        ...identity,
        tier: follow.alertTier,
        ...(hideSpoilers ? { hideSpoilers: true as const } : {}),
      });
    } else if (hideSpoilers) {
      spoilerFollows.push(identity);
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
        `${follow.momentId}::${follow.scope}::${follow.scopeId ?? ""}:${follow.tier}:${follow.hideSpoilers ? "hide" : "show"}`
    )
    .sort()
    .join(",");
  const spoilerFollows = state.spoilerFollows
    .map((follow) => `${follow.momentId}::${follow.scope}::${follow.scopeId ?? ""}`)
    .sort()
    .join(",");
  return `${alerts}|selective:${spoilerFollows}`;
}

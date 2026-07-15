import { MAX_LOCK_SCREEN_SLOTS } from "../system/lock-screen-slots";

/** The smallest bit of ActivityKit state needed to decide whether a tile
 * can stay in place. `null` means an older native build reported the game id
 * but cannot report the static No-Spoilers attribute. In that case we restart
 * once so the current preference becomes authoritative. */
export type ActiveLiveActivityState = boolean | null;

export type DesiredLiveActivity<T> = {
  gameId: string;
  redacted: boolean;
  value: T;
};

export type LiveActivityReconcilePlan<T> = {
  /** Authoritative slot holders, already capped and de-duplicated. */
  desired: DesiredLiveActivity<T>[];
  /** Activities to end before any replacement starts. */
  endGameIds: string[];
  /** Desired activities to start after the end pass. */
  start: DesiredLiveActivity<T>[];
  /** Device-local reveal flags to clear before starting newly-hidden tiles. */
  clearRevealGameIds: string[];
};

/**
 * Build the ActivityKit reconciliation plan shared by overflow and
 * No-Spoilers transitions.
 *
 * The input order is newest pin first. Only the first three unique games are
 * desired. A redaction change requires a restart because `redacted` is a
 * static Activity attribute, not mutable ContentState.
 */
export function planLiveActivityReconciliation<T>(
  desiredInOrder: DesiredLiveActivity<T>[],
  active: ReadonlyMap<string, ActiveLiveActivityState>,
  max: number = MAX_LOCK_SCREEN_SLOTS
): LiveActivityReconcilePlan<T> {
  const desired: DesiredLiveActivity<T>[] = [];
  const seen = new Set<string>();

  for (const item of desiredInOrder) {
    if (seen.has(item.gameId)) continue;
    seen.add(item.gameId);
    desired.push(item);
    if (desired.length >= max) break;
  }

  const desiredById = new Map(desired.map((item) => [item.gameId, item]));
  const endGameIds: string[] = [];
  const restartIds = new Set<string>();

  for (const [gameId, currentRedacted] of active) {
    const next = desiredById.get(gameId);
    if (!next) {
      endGameIds.push(gameId);
      continue;
    }

    // `null` is deliberately treated as a mismatch. Older builds cannot
    // prove the static attribute is correct, so one safe restart establishes
    // the current truth instead of risking a spoiler leak.
    if (currentRedacted !== next.redacted) {
      endGameIds.push(gameId);
      restartIds.add(gameId);
    }
  }

  const start = desired.filter(
    (item) => !active.has(item.gameId) || restartIds.has(item.gameId)
  );
  // Clear before EVERY redacted start, not only visible→hidden restarts.
  // A prior reveal flag can outlive an unpin/end; without this, re-pinning
  // the still-hidden game would immediately expose its score.
  const clearRevealGameIds = start
    .filter((item) => item.redacted)
    .map((item) => item.gameId);

  return { desired, endGameIds, start, clearRevealGameIds };
}

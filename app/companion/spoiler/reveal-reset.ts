import type { Follow } from "../state/types";

export type RevealPrivacyState = {
  globalNoSpoilers: boolean;
  selectiveHiddenFollowKey: string;
};

/** Stable set key. Ordering and non-spoiler follow edits cannot trigger a reset. */
export function selectiveHiddenFollowKey(follows: readonly Follow[]): string {
  const keys = follows
    .filter((follow) => follow.hideSpoilers)
    .map((follow) => `${follow.kind}:${follow.id.trim().toUpperCase()}`);
  return Array.from(new Set(keys)).sort().join("|");
}

/**
 * Reveals expire when hiding is newly enabled globally, or when a newly
 * hidden selective follow expands the protected set. Removing a hidden
 * follow weakens privacy, so it must not unexpectedly re-hide unrelated
 * games the user already revealed.
 */
export function shouldResetRevealLevels(
  previous: RevealPrivacyState,
  current: RevealPrivacyState
): boolean {
  const globalTurnedOn =
    !previous.globalNoSpoilers && current.globalNoSpoilers;
  const previousHidden = new Set(
    previous.selectiveHiddenFollowKey.split("|").filter(Boolean)
  );
  const selectiveHidingAdded = current.selectiveHiddenFollowKey
    .split("|")
    .filter(Boolean)
    .some((key) => !previousHidden.has(key));
  return globalTurnedOn || selectiveHidingAdded;
}

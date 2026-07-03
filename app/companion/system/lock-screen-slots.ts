// Lock-screen slot arithmetic — the shared truth behind the docking meter
// and the four TrackControl states. Pure (no React, no DOM) so it can be
// unit-tested in isolation and reused by Watching's promoted meter without
// dragging a component along.
//
// A "slot" is one of the concurrent Live Activities the app will run on the
// lock screen. Callers pass `pinnedLiveIds` — the ordered list of pinned,
// currently-live game ids — in the same newest-pinned-first order the
// LiveActivitySync poll uses to decide which games win a slot.

// Cap on concurrent lock-screen Live Activities. Mirrors MAX_LIVE_ACTIVITIES
// in LiveActivitySync.tsx (the poll enforces the same 3) and the "3" the user
// already knows from the free alert slots. Kept as its own const here so the
// pure math has no React import; the two must stay in lockstep.
export const MAX_LOCK_SCREEN_SLOTS = 3;

export type SlotState = {
  /** Filled slots, clamped to `max` (the meter never draws a 4th pip). */
  used: number;
  /** The cap (default MAX_LOCK_SCREEN_SLOTS). */
  max: number;
  /** True when this gameId currently holds one of the first `max` slots. */
  holds: boolean;
  /** True when the cap is reached AND this game is not one of the holders,
   *  so it cannot get a lock-screen slot until one is freed. */
  full: boolean;
};

/** Slot state for one game against the current pinned-and-live set.
 *  Pure and total: safe with an empty list, duplicate ids, or a gameId that
 *  isn't in the list at all. */
export function slotState(
  pinnedLiveIds: string[],
  gameId: string,
  max: number = MAX_LOCK_SCREEN_SLOTS
): SlotState {
  const used = Math.min(pinnedLiveIds.length, max);
  // A game holds a slot only if it lands within the first `max` entries —
  // the same order the sync poll grants tiles in (newest-pinned win).
  const holds = pinnedLiveIds.slice(0, max).includes(gameId);
  const full = pinnedLiveIds.length >= max && !holds;
  return { used, max, holds, full };
}

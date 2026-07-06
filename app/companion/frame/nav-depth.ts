"use client";

// In-app navigation depth (parked-feedback batch 2026-07-06, priority
// item: "the back button doesn't always take the user back").
//
// DetailCrumbs' back affordance was a HARDCODED parent link — a game
// detail opened from Today said "← WATCHING" and took you to Watching, a
// screen you may never have visited. Real back needs to know whether the
// previous history entry is in-app. This module tracks that with plain
// module state: NavDepthTracker (mounted in CompanionFrame) notes every
// pathname change after the first page of the session. Module state
// resets on a full reload / cold deep link, which is exactly when the
// static parent fallback is correct.

let lastPathname: string | null = null;
let depth = 0;

/** Record the current pathname; increments depth on every in-app route
 *  change after the first page. Called by NavDepthTracker. */
export function recordPathname(pathname: string): void {
  if (lastPathname !== null && lastPathname !== pathname) depth += 1;
  lastPathname = pathname;
}

/** True when at least one in-app navigation happened this session — i.e.
 *  history.back() lands somewhere inside the app, not on an empty tab or
 *  an external referrer. */
export function hasInAppHistory(): boolean {
  return depth > 0;
}

"use client";

import { useEffect, useRef } from "react";

// Shared polling primitive. Captures the ONLY thing the app's live-data
// hooks had in common: run an async loader on mount and on a
// visibility-aware interval whose cadence depends on a liveness
// predicate, then clean up. Previously this ~25-line scaffold
// (pageIsVisible + schedule() recursion + visibilitychange listener +
// teardown) was copy-pasted across use-series-data, use-country-data,
// use-today-data, use-watching-data, and use-live-pinned.
//
// Deliberately minimal: it does NOT own state, transforms, refetch, or
// any domain logic. Each hook keeps all of that. The loader receives an
// `isCancelled()` accessor and must check it after any await before
// calling setState — exactly the post-unmount guard each hook had via
// its own `mounted` ref. This keeps the migration behavior-preserving:
// we swapped the plumbing, not the semantics.
//
// `getIntervalMs` is read fresh on every tick, so a hook can return a
// shorter cadence while a game is live and a longer one when idle just
// by closing over its latest data.

export function useVisibilityPoll(
  load: (isCancelled: () => boolean) => void | Promise<void>,
  getIntervalMs: () => number,
  enabled = true
): void {
  // Keep the latest closures in refs so changing data/predicates each
  // render doesn't tear down and re-create the interval. Synced in an
  // effect (React 19 forbids writing refs during render).
  const loadRef = useRef(load);
  const intervalRef = useRef(getIntervalMs);
  useEffect(() => {
    loadRef.current = load;
    intervalRef.current = getIntervalMs;
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const isCancelled = () => cancelled;
    const visible = () =>
      typeof document === "undefined" ||
      document.visibilityState === "visible";

    const run = async () => {
      if (visible()) await loadRef.current(isCancelled);
    };

    const schedule = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (cancelled) return;
        await run();
        if (!cancelled) schedule();
      }, intervalRef.current());
    };

    // Initial load is UNCONDITIONAL — a fresh mount must fetch even if the tab
    // is hidden (PWA cold-open then immediately backgrounded, or iOS's "resume
    // as hidden" quirk), otherwise the loading shell hangs until a manual
    // background→foreground. Recurring ticks + the visibilitychange handler
    // stay visibility-gated.
    void loadRef.current(isCancelled);
    schedule();

    const onVisibilityChange = () => {
      if (visible()) {
        void run();
        schedule();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [enabled]);
}

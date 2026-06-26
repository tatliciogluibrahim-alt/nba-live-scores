"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// Run a brief exit animation, then fire the real removal. Returns `exiting`
// (drive a collapse/fade off it) and `begin` (call instead of the removal —
// e.g. on a dismiss/unpin tap). The removal runs after `ms`, matched to the
// CSS transition. Reduced-motion is handled by the consumer's
// motion-reduce:* classes collapsing the transition to instant.
export function useExit(onDone: () => void, ms = 200) {
  const [exiting, setExiting] = useState(false);
  // Track the pending timer so we can cancel it on unmount (avoid firing
  // onDone / setState after the component is gone) and so a second begin()
  // can't stack a duplicate removal.
  const timer = useRef<number | null>(null);
  const begin = useCallback(() => {
    if (timer.current !== null) return;
    setExiting(true);
    timer.current = window.setTimeout(onDone, ms);
  }, [onDone, ms]);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );
  return { exiting, begin };
}

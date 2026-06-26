"use client";

import { useState, useCallback } from "react";

// Run a brief exit animation, then fire the real removal. Returns `exiting`
// (drive a collapse/fade off it) and `begin` (call instead of the removal —
// e.g. on a dismiss/unpin tap). The removal runs after `ms`, matched to the
// CSS transition. Reduced-motion is handled by the consumer's
// motion-reduce:* classes collapsing the transition to instant.
export function useExit(onDone: () => void, ms = 200) {
  const [exiting, setExiting] = useState(false);
  const begin = useCallback(() => {
    setExiting(true);
    window.setTimeout(onDone, ms);
  }, [onDone, ms]);
  return { exiting, begin };
}

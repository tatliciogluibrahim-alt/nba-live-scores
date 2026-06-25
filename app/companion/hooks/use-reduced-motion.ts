"use client";

import { useSyncExternalStore } from "react";

// Hydration-safe `prefers-reduced-motion`. Server + first client render return
// false (motion on) so SSR and hydration match; it then settles to the real
// value and re-renders. Use to gate JS-driven / inline-style motion that the
// CSS `@media (prefers-reduced-motion)` guard can't reach.

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia(QUERY).matches
  );
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

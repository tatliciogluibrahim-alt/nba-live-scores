// SSR-safe localStorage helpers for the tier-legend one-time-seen flag.
// Pattern mirrors app/companion/game/TrackControl.tsx (DOCK_HINT_KEY):
// guard typeof window, try/catch for blocked storage, pure side-effect-free
// reads so the util stays fully testable in a node environment.

const KEY = "no-noise-tier-legend-seen";

/** Returns true when the user has already dismissed the tier legend.
 *  Returns false on SSR (no window) or when the flag is not set. */
export function readLegendSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Storage blocked — treat as unseen so the legend stays visible.
    return false;
  }
}

/** Marks the tier legend as seen. Safe to call on SSR (no-op). */
export function writeLegendSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked — the dismiss just won't persist; harmless.
  }
}

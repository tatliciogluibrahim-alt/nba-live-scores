// Utility for detecting whether the PWA is currently running inside
// the Capacitor native wrapper (iOS, eventually Android) versus a
// regular browser. Used to suppress PWA-only affordances like the
// "Add to Home Screen" prompt — those make no sense once the user
// has the App Store version installed.
//
// Why a dynamic import: Capacitor's getPlatform() works fine when
// the @capacitor/core JS is loaded inside the wrapper, but on web
// the import resolves and returns "web" cleanly. We expose a
// synchronous detector that reads a window-level flag the
// CapacitorPushBootstrap effect sets after its initial check — that
// way components can call this in render without async juggling.

let cachedIsNative: boolean | null = null;

/** Synchronous read of whether the current process is inside the
 *  Capacitor native wrapper. Safe to call in render. Returns false
 *  during SSR (no window). The actual platform detection runs once
 *  on first call via a window check. */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  if (cachedIsNative !== null) return cachedIsNative;

  // Capacitor injects a `Capacitor` object on `window` when the JS
  // bridge boots. Its `isNativePlatform()` is the canonical check.
  // Falling back to `getPlatform() !== "web"` if the helper isn't
  // present for any reason (older builds, partial injection).
  const cap = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }).Capacitor;

  if (!cap) {
    cachedIsNative = false;
    return false;
  }

  if (typeof cap.isNativePlatform === "function") {
    cachedIsNative = cap.isNativePlatform();
    return cachedIsNative;
  }

  if (typeof cap.getPlatform === "function") {
    cachedIsNative = cap.getPlatform() !== "web";
    return cachedIsNative;
  }

  cachedIsNative = false;
  return false;
}

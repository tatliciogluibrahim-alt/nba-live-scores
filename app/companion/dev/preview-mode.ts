"use client";

// Preview-mode helpers. The WC live-day simulation harness lets us
// feel the day-of UX without waiting for June 11 — when preview mode
// is active, the World Cup data hooks (Today / Country / Watching /
// Game detail) swap their fetch URL from `/api/world-cup` to
// `/api/preview/world-cup`, which returns a hardcoded realistic
// match-day snapshot.
//
// Preview is *sticky per browser session*. Visit any URL with
// `?preview=wc-day` once and the flag persists in sessionStorage so
// internal navigations (Today → /country/USA → /game/preview-...)
// stay in preview mode without manually re-adding the query param.
// Closing the tab clears it. Visiting `?preview=clear` clears it.
//
// Only WC data is mocked. NBA games stay on the real feed so a live
// NBA game alongside a mocked WC day shows the realistic stacking
// the user would see at the height of the season.

export const WC_PREVIEW_PARAM = "preview";
export const WC_PREVIEW_VALUE = "wc-day";
export const WC_PREVIEW_CLEAR = "clear";
const SESSION_KEY = "nns:wc-preview";

/** True when preview mode is active for this browser session. Reads
 *  the URL first (so a deep-link can enable preview), then falls back
 *  to sessionStorage (so internal navigations stay in preview).
 *  SSR-safe — returns false on the server. */
export function isWCPreviewMode(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const url = new URLSearchParams(window.location.search);
    const param = url.get(WC_PREVIEW_PARAM);

    if (param === WC_PREVIEW_VALUE) {
      // Pin to session so the next navigation keeps us in preview.
      window.sessionStorage.setItem(SESSION_KEY, "1");
      return true;
    }

    if (param === WC_PREVIEW_CLEAR) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return false;
    }

    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    // sessionStorage can throw under Private Mode / strict cookie
    // settings. Fall back to URL-only detection.
    return (
      new URLSearchParams(window.location.search).get(WC_PREVIEW_PARAM) ===
      WC_PREVIEW_VALUE
    );
  }
}

/** URL to fetch World Cup data from, based on current preview state. */
export function wcFeedUrl(): string {
  return isWCPreviewMode() ? "/api/preview/world-cup" : "/api/world-cup";
}

/** Explicit exit. Used by the PreviewModeBanner's exit link. */
export function clearWCPreview(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Best-effort.
  }
}

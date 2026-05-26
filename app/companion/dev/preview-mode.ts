"use client";

// Preview-mode helpers. The WC live-day simulation harness lets us
// feel the day-of UX without waiting for June 11 — when a URL has
// `?preview=wc-day`, the World Cup data hooks swap their fetch URL
// from `/api/world-cup` to `/api/preview/world-cup`, which returns a
// hardcoded realistic match-day snapshot.
//
// Only WC data is mocked. NBA games stay on the real feed so a live
// NBA game alongside a mocked WC day shows the realistic stacking
// the user would see at the height of the season.
//
// Detection is window-only (no server reads) so SSR isn't affected,
// and the param survives across hook re-runs because we read it
// fresh each time rather than caching.

export const WC_PREVIEW_PARAM = "preview";
export const WC_PREVIEW_VALUE = "wc-day";

/** True when the current URL has `?preview=wc-day`. SSR-safe — returns
 *  false on the server so the production fetch path is used in
 *  initial render and the preview path is picked up on hydration. */
export function isWCPreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get(WC_PREVIEW_PARAM) ===
    WC_PREVIEW_VALUE
  );
}

/** URL to fetch World Cup data from, based on current preview state. */
export function wcFeedUrl(): string {
  return isWCPreviewMode() ? "/api/preview/world-cup" : "/api/world-cup";
}

"use client";

import { useEffect, useState } from "react";
import { clearWCPreview, isWCPreviewMode } from "./preview-mode";

// Pinned banner at the top of every screen when the WC live-day
// simulation harness is active. Two jobs:
//   1. Make mocked data unmistakable from real data — without this,
//      the simulated scoreline could be misread as a real one.
//   2. Offer a clean exit so the operator isn't stuck in preview
//      after they're done testing.
//
// SSR-safe: returns null on the server (no URL access), then
// re-checks after mount. Re-polls every second to catch internal
// navigations without a `popstate` event.

export function PreviewModeBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const update = () => setActive(isWCPreviewMode());
    update();

    window.addEventListener("popstate", update);
    const interval = setInterval(update, 1000);

    return () => {
      window.removeEventListener("popstate", update);
      clearInterval(interval);
    };
  }, []);

  if (!active) return null;

  const handleExit = () => {
    clearWCPreview();
    // Drop any preview= param from the URL so a refresh doesn't
    // re-enable, then force a full reload so every hook re-fetches
    // against the real feed.
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    window.location.href = url.pathname + url.search;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="World Cup preview mode active"
      style={{
        // Inline at the top of the scroll container rather than sticky.
        // Both this banner and BrandBar were targeting `top: 0` and the
        // banner's higher z-index visually covered BrandBar when
        // scrolled. Letting the banner scroll away with content keeps
        // both surfaces clean — it's visible on every page load and on
        // every internal navigation, which is enough warning given
        // preview is a deliberate operator action.
        background: "var(--wc)",
        color: "var(--cream)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "6px 12px",
        paddingTop: "max(env(safe-area-inset-top), 6px)",
      }}
    >
      <span>Preview · WC live-day simulation</span>
      <button
        type="button"
        onClick={handleExit}
        aria-label="Exit preview mode"
        // Min-height bumped for tap target. Padding stays small so the
        // banner doesn't bloat vertically — meets target via min-height.
        style={{
          color: "var(--cream)",
          background: "transparent",
          border: "1px solid var(--cream-on-dark-hairline)",
          borderRadius: 999,
          padding: "4px 12px",
          minHeight: 32,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Exit
      </button>
    </div>
  );
}

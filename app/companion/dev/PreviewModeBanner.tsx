"use client";

import { useEffect, useState } from "react";
import { isWCPreviewMode } from "./preview-mode";

// Thin caution-yellow strip that pins to the top of every screen when
// the WC live-day simulation harness is active. Lets the operator
// instantly tell mocked data apart from the real feed at a glance —
// without it, the simulated scoreline could be misread as a real one.
//
// SSR-safe: returns null on the server (no URL access), then re-checks
// after mount. Re-checks on `popstate` / `pushstate` too so navigating
// in/out of the preview URL flips the banner immediately.

export function PreviewModeBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const update = () => setActive(isWCPreviewMode());
    update();

    // Browser back/forward + any pushState/replaceState by Next router.
    window.addEventListener("popstate", update);
    // Next.js client navigation fires a custom event in some versions;
    // we also re-check periodically for safety, but cheap.
    const interval = setInterval(update, 1000);

    return () => {
      window.removeEventListener("popstate", update);
      clearInterval(interval);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-label="World Cup preview mode active"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "var(--wc)",
        color: "var(--cream)",
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "6px 12px",
        // Tuck under the iOS status bar / Dynamic Island
        paddingTop: "max(env(safe-area-inset-top), 6px)",
      }}
    >
      Preview · WC live-day simulation
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// App-shell scroll reset (D4 Task 6d). With the inner scroller, App
// Router's window-based scroll restoration no-ops on app routes below
// md — without this, a new route opens wherever the last one was
// scrolled. Resets the scroller (and window, harmless) on path change.
export function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    document.getElementById("nns-scroll")?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

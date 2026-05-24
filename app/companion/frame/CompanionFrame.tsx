import type { ReactNode } from "react";
import { TabBar } from "./TabBar";

// Per-screen frame: scroll surface + fixed bottom tab bar.
// The TabBar reserves ~72px at the bottom — we pad the scroll area to match.

export function CompanionFrame({
  children,
  hideTabBar = false,
}: {
  children: ReactNode;
  /** Hide the bottom tab bar (e.g. modal-style screens). */
  hideTabBar?: boolean;
}) {
  return (
    <div
      className="relative min-h-[100svh]"
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        // Reserve the iOS status-bar / Dynamic Island region so titles and
        // CrumbBars never clip. `viewport-fit=cover` (set in layout.tsx)
        // lets content extend behind the status bar by default — this
        // padding pushes our content back out. The `max()` floor of 12px
        // protects against in-app browsers and embedded webviews where
        // `env(safe-area-inset-top)` returns 0 despite a visible status
        // bar overlay.
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: hideTabBar
          ? "max(env(safe-area-inset-bottom), 16px)"
          : "calc(max(env(safe-area-inset-bottom), 12px) + 84px)",
      }}
    >
      {children}
      {!hideTabBar ? <TabBar /> : null}
    </div>
  );
}

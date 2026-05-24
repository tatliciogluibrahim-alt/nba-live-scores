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
        // Top safe-area is now handled by the sticky BrandBar / CrumbBar so
        // the header stays pinned below the iOS status bar even during
        // scroll (backdrop-blur masks content underneath). Bottom keeps
        // its tab-bar buffer.
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

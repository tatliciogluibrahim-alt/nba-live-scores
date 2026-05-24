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
        // padding pushes our content back out.
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: hideTabBar
          ? "max(env(safe-area-inset-bottom), 16px)"
          : "calc(env(safe-area-inset-bottom) + 84px)",
      }}
    >
      {children}
      {!hideTabBar ? <TabBar /> : null}
    </div>
  );
}

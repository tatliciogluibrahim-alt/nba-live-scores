import type { ReactNode } from "react";
import { PreviewModeBanner } from "../dev/PreviewModeBanner";
import { TabBar } from "./TabBar";
import { DesktopSidebarNav } from "./DesktopSidebarNav";

// Per-screen frame: scroll surface + fixed bottom tab bar (mobile)
// or left sidebar rail (desktop, md+). The TabBar reserves ~72px at
// the bottom — we pad the scroll area to match on mobile. On md+ the
// TabBar hides itself, the sidebar rail takes over, and the main
// column offsets right by the rail width.
//
// Phase 22.5-D — the `desktopNav` prop enables the desktop shell on
// the three primary routes (Today / Following / Watching) by passing
// the active tab id. Detail and content pages can omit it and keep
// their mobile-shaped layout on desktop (intentional — those screens
// are already content-shell-based and look fine narrow).

const MOBILE_BOTTOM_PAD =
  "pb-[calc(max(env(safe-area-inset-bottom),12px)+84px)] md:pb-[max(env(safe-area-inset-bottom),16px)]";
const HIDE_BOTTOM_PAD = "pb-[max(env(safe-area-inset-bottom),16px)]";

export function CompanionFrame({
  children,
  hideTabBar = false,
  desktopNav,
}: {
  children: ReactNode;
  /** Hide the bottom tab bar (e.g. modal-style screens). */
  hideTabBar?: boolean;
  /** Active tab id for the desktop sidebar nav. When set, renders the
   *  rail on md+ and offsets the main column. Omit on detail/content
   *  pages that should keep the narrow column on desktop. */
  desktopNav?: "today" | "following" | "watching";
}) {
  const padClass = hideTabBar ? HIDE_BOTTOM_PAD : MOBILE_BOTTOM_PAD;
  return (
    <div
      className={`relative min-h-[100svh] ${padClass}`}
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
      }}
    >
      <PreviewModeBanner />
      {desktopNav ? <DesktopSidebarNav active={desktopNav} /> : null}
      <div className={desktopNav ? "md:pl-[220px]" : ""}>{children}</div>
      {!hideTabBar ? <TabBar /> : null}
    </div>
  );
}

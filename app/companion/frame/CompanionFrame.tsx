import type { ReactNode } from "react";
import { PreviewModeBanner } from "../dev/PreviewModeBanner";
import { TabBar } from "./TabBar";
import { DesktopSidebarNav } from "./DesktopSidebarNav";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

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
  /** Desktop sidebar mode. When set, renders the left rail on md+ and
   *  offsets the main column. Pass "today" / "following" / "watching"
   *  on the primary routes (the matching nav entry highlights). Pass
   *  "detail" on detail screens (game / series / tournament / country
   *  / team) so the rail stays present for navigation consistency,
   *  with nothing highlighted. Omit entirely only on standalone
   *  surfaces (marketing, onboarding) that shouldn't show app chrome. */
  desktopNav?: "today" | "schedule" | "following" | "watching" | "detail";
}) {
  const padClass = hideTabBar ? HIDE_BOTTOM_PAD : MOBILE_BOTTOM_PAD;
  // "detail" renders the rail without a highlighted tab — pass through
  // the literal tab ids only; the sidebar's own pathname check handles
  // highlighting and correctly highlights nothing on detail routes.
  const activeTab =
    desktopNav === "today" ||
    desktopNav === "schedule" ||
    desktopNav === "following" ||
    desktopNav === "watching"
      ? desktopNav
      : undefined;
  return (
    <div
      className={`relative min-h-[100svh] ${padClass}`}
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        // Horizontal safe-area insets — in LANDSCAPE on a Dynamic-Island
        // device, the island moves to the screen's left or right edge and
        // overlaps content unless we pad. The `env()` value is 0 in
        // portrait and ~50px in landscape, so this is invisible in normal
        // use and only kicks in when rotated. Reported by a beta tester
        // who saw the island clipping onboarding headlines in landscape.
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <PreviewModeBanner />
      {desktopNav ? <DesktopSidebarNav active={activeTab} /> : null}
      {desktopNav ? <KeyboardShortcuts /> : null}
      <div className={desktopNav ? "md:pl-[220px]" : ""}>{children}</div>
      {!hideTabBar ? <TabBar /> : null}
    </div>
  );
}

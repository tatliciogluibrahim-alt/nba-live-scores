import type { ReactNode } from "react";
import { PreviewModeBanner } from "../dev/PreviewModeBanner";
import { ScrollReset } from "./ScrollReset";
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

// App shell (D4 Task 6d, iOS 26 WebKit bug 297779): below md the frame is a
// non-scrolling flex column — an inner <main id="nns-scroll"> scrolls and the
// TabBar sits after it in normal flow, so no position:fixed element exists to
// detach. Desktop (md+) keeps document scroll untouched. The old 84px bottom
// padding that reserved space under the fixed bar is gone; the bar now takes
// real layout space. See docs/superpowers/research/2026-07-03-ios-tabbar-detach.md.
const SCROLLER_PAD = "pb-4 md:pb-[max(env(safe-area-inset-bottom),16px)]";
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
  desktopNav?: "today" | "following" | "watching" | "detail";
}) {
  const padClass = hideTabBar ? HIDE_BOTTOM_PAD : SCROLLER_PAD;
  // "detail" renders the rail without a highlighted tab — pass through
  // the literal tab ids only; the sidebar's own pathname check handles
  // highlighting and correctly highlights nothing on detail routes.
  const activeTab =
    desktopNav === "today" || desktopNav === "following" || desktopNav === "watching"
      ? desktopNav
      : undefined;
  return (
    <div
      id="nns-frame"
      className={
        "relative flex h-[100svh] flex-col overflow-hidden " +
        "md:block md:h-auto md:min-h-[100svh] md:overflow-visible"
      }
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
      <ScrollReset />
      {desktopNav ? <DesktopSidebarNav active={activeTab} /> : null}
      {desktopNav ? <KeyboardShortcuts /> : null}
      {/* Structural scroller, not the page landmark — route clients own
          their own <main> (one landmark per page, as before the shell). */}
      <div
        id="nns-scroll"
        className={
          `min-h-0 flex-1 overflow-y-auto overscroll-contain ${padClass} ` +
          "md:flex-none md:overflow-visible md:overscroll-auto"
        }
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className={desktopNav ? "md:pl-[220px]" : ""}>{children}</div>
      </div>
      {!hideTabBar ? <TabBar /> : null}
    </div>
  );
}

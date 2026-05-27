import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

// Top-of-page brand strip. Trailing slot for icon buttons (bell, plus, etc).
// Used on Today / Following / Watching root screens.
//
// Stage 14E swapped the "nn" lettermark for the experimental BrandMark
// (scoreboard-row + status-pip motif). Reversible — revert by swapping
// <BrandMark /> back to the inline lettermark span if the symbol doesn't
// land in user testing.

export function BrandBar({ trailing }: { trailing?: ReactNode }) {
  return (
    <header
      // Mobile-only. The desktop sidebar (Phase 22.5-D) carries the
      // brand lockup at the top of the rail, so the top strip is
      // redundant at md+. Detail/content pages don't pass desktopNav
      // to CompanionFrame and keep this bar visible — that's fine,
      // those screens stay mobile-shaped on desktop intentionally.
      className="sticky top-0 z-30 flex items-center justify-between px-4 pb-2 md:hidden"
      style={{
        // Safe-area-top moved from CompanionFrame to here so the sticky
        // header pins below the iOS status bar / Dynamic Island. Backdrop
        // blur masks content that scrolls underneath — the standard
        // iOS pattern for translucent headers.
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        background: "var(--bar-blur-bg)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
      }}
    >
      <div className="flex items-center gap-2">
        <BrandMark size={24} />
        <span
          className="text-[13px]"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          No Noise Scores
        </span>
      </div>
      {trailing ? <div className="flex items-center gap-2">{trailing}</div> : null}
    </header>
  );
}

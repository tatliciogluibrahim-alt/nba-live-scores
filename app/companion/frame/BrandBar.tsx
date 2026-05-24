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
      className="flex items-center justify-between px-4 pb-2 pt-4"
      style={{ background: "var(--cream)" }}
    >
      <div className="flex items-center gap-2">
        <BrandMark size={22} />
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

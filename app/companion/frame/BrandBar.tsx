import type { ReactNode } from "react";

// Top-of-page brand strip. Trailing slot for icon buttons (bell, plus, etc).
// Used on Today / Following / Watching root screens.

export function BrandBar({ trailing }: { trailing?: ReactNode }) {
  return (
    <header
      className="flex items-center justify-between px-4 pb-2 pt-4"
      style={{ background: "var(--cream)" }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-6 w-6 place-items-center rounded-md text-[10px]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.02em",
          }}
        >
          nn
        </span>
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

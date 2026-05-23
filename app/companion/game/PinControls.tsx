"use client";

import Link from "next/link";

// Shared pin / unpin + Watching link control. Used by both NBA Live
// Companion and the WC game shell.

export function PinControls({
  pinned,
  onPin,
  onUnpin,
  subject,
  className,
}: {
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  subject: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {pinned ? (
        <button
          type="button"
          onClick={onUnpin}
          aria-label={`Unpin ${subject}`}
          aria-pressed
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          ✓ Pinned
        </button>
      ) : (
        <button
          type="button"
          onClick={onPin}
          aria-label={`Pin ${subject} to Watching`}
          aria-pressed={false}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Pin to Watching
        </button>
      )}
      <Link
        href="/watching"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
        }}
        aria-label="Open Watching"
      >
        Watching
      </Link>
    </div>
  );
}

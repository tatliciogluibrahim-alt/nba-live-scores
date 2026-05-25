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
  // Pin controls keep the core model separate: pinning bookmarks this game,
  // while follows drive alerts.
  return (
    <div className={className}>
    <div className="flex items-center gap-2">
      {pinned ? (
        // Pinned state: primary action is to unpin (outline so the
        // destructive-ish intent reads lighter than a filled button).
        // A small checkmark confirms the current pinned state inline.
        <button
          type="button"
          onClick={onUnpin}
          aria-label={`Unpin ${subject}`}
          aria-pressed
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--mute-1)",
            }}
          >
            ✓
          </span>
          Unpin
        </button>
      ) : (
        <button
          type="button"
          onClick={onPin}
          aria-label={`Pin ${subject} to Watching`}
          aria-pressed={false}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Pin to Watching
        </button>
      )}
      {pinned ? (
        <Link
          href="/watching"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--mute-1)",
            border: "1px solid var(--line)",
          }}
          aria-label="Open Watching"
        >
          Open Watching
        </Link>
      ) : null}
    </div>
    <p
      className="mt-2 text-[11px] leading-snug"
      style={{ color: "var(--mute-1)", fontWeight: 500 }}
    >
      Pinning keeps this game in Watching. Alerts come from{" "}
      <Link
        href="/following"
        style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
      >
        follows
      </Link>
      .
    </p>
    </div>
  );
}

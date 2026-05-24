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
  // One clear action per state — pin XOR unpin. "Go to Watching" is always
  // present as a secondary navigation option but never competes with the
  // primary action label. "Watching" alone read as a state; the explicit
  // verb "Go to" makes it unambiguously a navigation prompt.
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
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
        // Unpinned state: primary action is clearly "Pin to Watching".
        // Filled ink so it reads as the dominant CTA on the page.
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
      {/* "Go to Watching" — unambiguous verb, same outline weight whether
          pinned or not. When pinned, sits alongside Unpin as the navigation
          option; when unpinned, gives the user a direct route to their list. */}
      <Link
        href="/watching"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "transparent",
          color: "var(--mute-1)",
          border: "1px solid var(--line)",
        }}
        aria-label="Go to Watching"
      >
        Go to Watching
      </Link>
    </div>
  );
}

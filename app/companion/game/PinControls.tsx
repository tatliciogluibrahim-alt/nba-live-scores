"use client";

import Link from "next/link";

// Shared pin / unpin control. Used by both NBA Live Companion and the
// WC game shell. State-correct: an unpinned game offers just the pin
// action — "Open Watching" doesn't appear yet because pinning is the
// step the page is asking the user to take. Once the game is pinned,
// "Open Watching" appears as a quiet secondary link.

export function PinControls({
  pinned,
  onPin,
  onUnpin,
  subject,
  className,
  gameStatus,
}: {
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  subject: string;
  className?: string;
  /** Lifecycle of the game this control pins. For a FINAL game the
   *  "live-tracks it on your lock screen when it starts" line is false —
   *  the game already started and ended — so we switch to reference copy.
   *  Omitted (undefined) keeps the default forward-looking copy. */
  gameStatus?: "upcoming" | "live" | "final";
}) {
  // Final games can't be live-tracked; pinning them is for reference.
  const footnote =
    gameStatus === "final"
      ? "Pinning keeps this game in Watching for easy reference. Alerts come from follows."
      : "Pinning keeps this game in Watching and live-tracks it on your lock screen when it starts (up to 3 at once). Alerts come from follows.";

  return (
    <div className={className}>
      {pinned ? (
        <button
          type="button"
          onClick={onUnpin}
          aria-label={`Unpin ${subject}`}
          aria-pressed
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
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
          Pinned · Tap to unpin
        </button>
      ) : (
        <button
          type="button"
          onClick={onPin}
          aria-label={`Pin ${subject} to Watching`}
          aria-pressed={false}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Pin to Watching
        </button>
      )}

      <p
        className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[11px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        <span>{footnote}</span>
        {pinned ? (
          <Link
            href="/watching"
            aria-label="Open Watching"
            style={{ color: "var(--mute-1)", fontWeight: 600 }}
          >
            Open Watching →
          </Link>
        ) : null}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useIsNative } from "../dev/native-detect";

// Shared pin / unpin control. The single gesture that, on the native app,
// also live-tracks a game on the lock screen + home-screen widget. The
// label and footnote are state-aware so the gesture says what it does:
//
//   native + live, not pinned   → "Track on lock screen"
//   native + live, pinned       → "Live on your lock screen" (tap to stop)
//   native + upcoming           → "Pin to Watching" (tracks live when it starts)
//   web (no lock screen/widget) → plain "Pin to Watching", no lock-screen copy
//   final                       → reference-only copy (can't be live-tracked)
//
// Web-gated copy matters: lock-screen Live Activities + widgets exist only
// in the installed app, so the web/PWA must not claim them.

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
  /** Lifecycle of the game this control pins. Drives the live-tracking
   *  copy. Omitted keeps the calm default. */
  gameStatus?: "upcoming" | "live" | "final";
}) {
  const native = useIsNative();
  const isLive = gameStatus === "live";
  const isFinal = gameStatus === "final";

  // Button labels — only become lock-screen language on native live games,
  // so the word "Pin" never clashes with the separate Following concept.
  const pinnedLabel =
    native && isLive ? "Live on your lock screen" : "Pinned · Tap to unpin";
  const unpinnedLabel =
    native && isLive ? "Track on lock screen" : "Pin to Watching";

  const footnote = isFinal
    ? "Pinning keeps this game in Watching for easy reference. Alerts come from follows."
    : native
      ? isLive
        ? pinned
          ? "Following the score on your lock screen and home-screen widget. Up to 3 games at once."
          : "Follow the score live on your lock screen and home-screen widget. Up to 3 games at once."
        : "Pinning keeps it in Watching and tracks it live on your lock screen when it starts. Up to 3 games at once."
      : "Pinning keeps this game in Watching. Alerts come from follows.";

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
              color: native && isLive ? "var(--live)" : "var(--mute-1)",
            }}
          >
            {native && isLive ? "●" : "✓"}
          </span>
          {pinnedLabel}
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
          {unpinnedLabel}
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

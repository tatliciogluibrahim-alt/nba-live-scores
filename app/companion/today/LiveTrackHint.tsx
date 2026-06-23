"use client";

import { useState } from "react";
import { useIsNative } from "../dev/native-detect";

// Contextual one-time hint: the first time a followed game is live on
// Today, teach the lock-screen payoff of pinning. Native only (no lock
// screen on web), dismissible, and retired forever once dismissed
// (localStorage). Shows below the live lead, where the action is.

const HINT_KEY = "nns:hint:livetrack";

export function LiveTrackHint({ active }: { active: boolean }) {
  const native = useIsNative();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    try {
      return localStorage.getItem(HINT_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!native || !active || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* storage blocked — hide for this session anyway */
    }
    setDismissed(true);
  }

  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--wc)",
      }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--wc)",
          }}
        >
          Tip
        </p>
        <p
          className="mt-1 text-[13px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          Follow the score on your lock screen.
        </p>
        <p
          className="mt-0.5 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Pin a live game to track it on your lock screen and home-screen widget.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="-mr-1 -mt-1 shrink-0 p-1 text-[16px] leading-none"
        style={{ color: "var(--mute-2)" }}
      >
        ×
      </button>
    </div>
  );
}

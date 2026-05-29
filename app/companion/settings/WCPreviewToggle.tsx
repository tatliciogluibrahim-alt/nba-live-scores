"use client";

import { isCapacitorNative } from "../dev/native-detect";
import {
  isWCPreviewMode,
  enableWCPreview,
  clearWCPreview,
} from "../dev/preview-mode";

// DEV-ONLY: World Cup dress-rehearsal toggle for the native app.
//
// In a browser you'd just visit ?preview=wc-day, but the native app has
// no URL bar. This flips the sticky session flag so every WC-aware
// surface (Today, Watching, Country, Game detail, the home widget, and
// Live Activity detection) swaps to the hardcoded live match-day
// snapshot. Lets us feel a busy WC day before June 11.
//
// Renders nothing off-native. REMOVE before App Store submission.

export function WCPreviewToggle() {
  if (!isCapacitorNative()) return null;
  const on = isWCPreviewMode();

  function enter() {
    enableWCPreview();
    // Jump to Today so the WC match-day lands immediately, with all
    // hooks re-reading the preview feed on the fresh load.
    window.location.href = "/app";
  }

  function exit() {
    clearWCPreview();
    window.location.reload();
  }

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--line)", background: "var(--cream-2)" }}
    >
      <p
        className="mb-1 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--mute-1)" }}
      >
        Dev · World Cup dress rehearsal
      </p>
      <p className="mb-3 text-[13px]" style={{ color: "var(--mute-1)" }}>
        {on
          ? "Preview is ON. The app is showing a simulated World Cup match day."
          : "Swap the app to a live World Cup match day (Today, widget, Live Activity). Remove before ship."}
      </p>
      <button
        onClick={on ? exit : enter}
        className="rounded-full px-4 py-2 text-[13px] font-semibold"
        style={
          on
            ? { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" }
            : { background: "#1e6b3c", color: "#fff" }
        }
      >
        {on ? "Exit WC preview" : "Enter WC preview"}
      </button>
    </section>
  );
}

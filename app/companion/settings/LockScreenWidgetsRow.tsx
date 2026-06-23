"use client";

import { useIsNative } from "../dev/native-detect";

// Settings explainer for live-tracking + widgets. Native only — lock-screen
// Live Activities and home-screen widgets exist only in the installed app,
// so the web/PWA never shows this. Calm, reference-style: what it does, and
// how to add the widgets.

export function LockScreenWidgetsRow() {
  const native = useIsNative();
  if (!native) return null;

  return (
    <section
      className="rounded-[16px] border p-4"
      style={{ background: "var(--paper)", borderColor: "var(--line)" }}
    >
      <h2
        className="text-[15px]"
        style={{ color: "var(--ink)", fontWeight: 700, letterSpacing: "-0.01em" }}
      >
        Lock screen and widgets
      </h2>
      <p
        className="mt-1.5 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Pin a live game to follow its score on your lock screen. Up to 3 at
        once. Add a widget to keep scores on your home or lock screen.
      </p>

      <ul
        className="mt-3 space-y-1.5 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        <li>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>Live score widget.</span>{" "}
          Long-press your home screen, tap the plus, search No Noise Scores.
        </li>
        <li>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>Lock screen.</span>{" "}
          Long-press the lock screen, tap Customize, add the No Noise Scores
          widget under the clock.
        </li>
      </ul>
    </section>
  );
}

"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { WatchLine } from "../watch/WatchLine";

// Compact "this is the watch model" explainer. Not a broadcast guide —
// just two sentences plus one sample WatchLine so users can see what
// the component looks like in isolation.

export function WatchGuidanceBlock() {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Where-to-watch</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div
        className="rounded-[14px] border px-4 py-3"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        <p
          className="text-[13px]"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          One line per game.
        </p>
        <p
          className="mt-1 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Watch info appears on game cards when broadcasts are available. We keep it visible even when No-Spoilers is on, so you can still find the game.
        </p>

        <div className="mt-3">
          {/* Sample only — no real reminder behavior wired here. */}
          <WatchLine
            channel="Channel"
            stream="Stream"
            ariaSubject="sample game"
          />
        </div>
      </div>
    </section>
  );
}

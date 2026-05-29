"use client";

import { useState } from "react";
import { isCapacitorNative } from "../dev/native-detect";
import { startLiveActivity, endLiveActivity } from "../native/live-activity";

// DEV-ONLY: manual Live Activity trigger. Phase 22.5-3 verification.
//
// There's no reliable way to test the Live Activity render without a
// genuinely-live, pinned NBA game in the real /api/live-scores feed.
// During the offseason / between games there often isn't one, so this
// button fires a mock Activity directly to confirm the native
// ActivityKit pipeline (plugin → request → lock screen / Dynamic
// Island) works on-device.
//
// Renders nothing off-native. REMOVE before App Store submission —
// this is a developer affordance, not a user feature.

const TEST_GAME_ID = "dev-live-activity-test";

export function LiveActivityTester() {
  const [status, setStatus] = useState<string>("");

  // Off-native (web / desktop PWA) this is a no-op surface.
  if (!isCapacitorNative()) return null;

  async function handleStart() {
    setStatus("starting…");
    const ok = await startLiveActivity({
      gameId: TEST_GAME_ID,
      matchup: "OKC vs SA",
      stage: "NBA · Game 6",
      sport: "nba",
      awayCode: "OKC",
      awayScore: 88,
      homeCode: "SA",
      homeScore: 84,
      statusLine: "Q4 · 4:21",
      subline: "OKC leads series 3-2",
      accentHex: "#e55b2a",
    });
    setStatus(ok ? "started — check your lock screen" : "failed (see Xcode console)");
  }

  async function handleEnd() {
    setStatus("ending…");
    await endLiveActivity(TEST_GAME_ID);
    setStatus("ended");
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
        Dev · Live Activity test
      </p>
      <p className="mb-3 text-[13px]" style={{ color: "var(--mute-1)" }}>
        Fires a mock Live Activity to verify the native render. Remove before ship.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleStart}
          className="rounded-full px-4 py-2 text-[13px] font-semibold"
          style={{ background: "#e55b2a", color: "#fff" }}
        >
          Start test
        </button>
        <button
          onClick={handleEnd}
          className="rounded-full border px-4 py-2 text-[13px] font-semibold"
          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
        >
          End
        </button>
      </div>
      {status ? (
        <p className="mt-2 text-[12px]" style={{ color: "var(--mute-1)" }}>
          {status}
        </p>
      ) : null}
    </section>
  );
}

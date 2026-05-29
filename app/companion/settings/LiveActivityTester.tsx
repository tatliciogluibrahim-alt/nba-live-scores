"use client";

import { useState } from "react";
import { registerPlugin } from "@capacitor/core";
import { isCapacitorNative } from "../dev/native-detect";

// DEV-ONLY: manual Live Activity trigger with full on-screen reporting.
// Phase 22.5-3 verification.
//
// There's no reliable way to test the Live Activity render without a
// genuinely-live, pinned NBA game in the real feed, and during the
// offseason there often isn't one. This button calls the native
// LiveActivity plugin directly and prints every step on-screen (no
// Xcode console needed), with a timeout so a hung native call surfaces
// as a readable message instead of a silent spinner.
//
// Renders nothing off-native. REMOVE before App Store submission.

const TEST_GAME_ID = "dev-live-activity-test";
const PLUGIN_NAME = "LiveActivity";
const TIMEOUT_MS = 6000;

type StartResult = { id: string };
type LAPlugin = {
  start(opts: Record<string, unknown>): Promise<StartResult>;
  end(opts: { gameId: string }): Promise<void>;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function LiveActivityTester() {
  const [lines, setLines] = useState<string[]>([]);

  if (!isCapacitorNative()) return null;

  const log = (s: string) => setLines((prev) => [...prev, s]);

  async function handleStart() {
    setLines([]);
    log("1. native=true, registering plugin…");
    let plugin: LAPlugin;
    try {
      plugin = registerPlugin<LAPlugin>(PLUGIN_NAME);
      log("2. registerPlugin returned a proxy");
    } catch (e) {
      log(`2. registerPlugin threw: ${String(e)}`);
      return;
    }

    log("3. calling start()… (waiting up to 6s)");
    try {
      const res = await withTimeout(
        plugin.start({
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
        }),
        TIMEOUT_MS
      );
      log(`4. ✅ start resolved: id=${res?.id ?? "(no id)"}`);
      log("Check your lock screen / Dynamic Island.");
    } catch (e) {
      log(`4. ❌ start failed: ${String(e)}`);
      log("If 'timed out', the native start() never called resolve/reject.");
    }
  }

  async function handleEnd() {
    setLines([]);
    try {
      const plugin = registerPlugin<LAPlugin>(PLUGIN_NAME);
      await withTimeout(plugin.end({ gameId: TEST_GAME_ID }), TIMEOUT_MS);
      log("ended ✅");
    } catch (e) {
      log(`end failed: ${String(e)}`);
    }
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
        Fires a mock Live Activity and reports each step below. Remove before ship.
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
      {lines.length > 0 ? (
        <div
          className="mt-3 rounded-lg p-2 font-mono text-[11px] leading-relaxed"
          style={{ background: "var(--cream)", color: "var(--ink)" }}
        >
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

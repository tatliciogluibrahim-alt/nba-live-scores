"use client";

import { registerPlugin } from "@capacitor/core";
import { isCapacitorNative } from "../dev/native-detect";

// Web-side bridge to the native `LiveActivity` Capacitor plugin
// (ios/App/App/LiveActivityPlugin.swift — see docs/LIVE_ACTIVITY_BUILD.md).
//
// The native plugin starts an ActivityKit Live Activity for a pinned,
// live game and streams back the per-Activity APNs push token. The
// server-side scan then drives score updates via sendApnsLiveActivity.
//
// EVERYTHING here is a no-op on web (and in the Capacitor wrapper until
// the Swift plugin exists): getPlugin() returns null off-native, and
// each call resolves to a safe default. So this is safe to ship and
// deploy before the native half lands — it simply does nothing until a
// build that includes the plugin runs it.
//
// Plugin-name contract: the Swift side MUST register under the
// identifier "LiveActivity" (the string below). Keep them in lockstep.

const PLUGIN_NAME = "LiveActivity";

// APNs environment for the per-Activity push token. Xcode debug
// installs mint sandbox tokens; TestFlight / App Store builds mint
// production tokens. The server routes to the matching APNs host via
// the `sandbox` flag we store at register time. Flip this to `false`
// for the TestFlight / App Store build.
//
// (When the native plugin later reports its own aps-environment, this
// constant can be replaced by that runtime value. Until then it's the
// single source of truth and easy to find.)
export const LIVE_ACTIVITY_SANDBOX = true;

/** Mirror of the Swift `ContentState` + `ActivityAttributes` start args.
 *  Field names must match `LiveActivityPlugin.start` in Swift. */
export type LiveActivityStartInput = {
  gameId: string;
  matchup: string; // "OKC vs SA"
  stage: string; // "NBA · Game 6"
  sport: "nba" | "wc" | "nfl";
  awayCode: string;
  awayScore: number;
  homeCode: string;
  homeScore: number;
  statusLine: string; // "Q3 · 4:21"
  subline: string; // stake / context, may be ""
  accentHex: string; // "#e55b2a"
  /** Stadium Panel progress rail, 0...1. Computed via
   *  computeLiveActivityProgress() so the rail isn't empty at start. */
  progress: number;
};

export type LiveActivityPushTokenEvent = { gameId: string; token: string };

type PluginListenerHandle = { remove: () => void | Promise<void> };

type LiveActivityPlugin = {
  start(opts: LiveActivityStartInput): Promise<{ id: string }>;
  end(opts: { gameId: string }): Promise<void>;
  addListener(
    eventName: "pushToken",
    listener: (data: LiveActivityPushTokenEvent) => void
  ): Promise<PluginListenerHandle> | PluginListenerHandle;
};

// Resolved once on first access. `null` whenever we're not on native
// (web, SSR). Uses a static import of @capacitor/core (the dynamic
// import was silently failing in production Next.js builds because
// webpack bundles the module into other chunks).
let plugin: LiveActivityPlugin | null | undefined;

// SYNCHRONOUS by design. If this is `async`, callers do `await getPlugin()`,
// and JS promise resolution unwraps the returned value as a thenable. The
// Capacitor proxy intercepts ALL property access (including `.then`), so the
// await dispatches a phantom `then` native call that hangs forever, silently
// killing every LiveActivity method dispatch. Matches widget-bridge.ts.
function getPlugin(): LiveActivityPlugin | null {
  if (plugin !== undefined) return plugin;
  if (!isCapacitorNative()) {
    plugin = null;
    return null;
  }
  try {
    plugin = registerPlugin<LiveActivityPlugin>(PLUGIN_NAME);
    return plugin;
  } catch {
    plugin = null;
    return null;
  }
}

/** Start a Live Activity for a pinned, live game. Resolves true when the
 *  native plugin accepted it, false on web / failure. */
export async function startLiveActivity(
  input: LiveActivityStartInput
): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    await plugin.start(input);
    return true;
  } catch (err) {
    console.warn("[LiveActivity] start failed:", err);
    return false;
  }
}

/** End the Live Activity for a game (final / unpinned). No-op off-native. */
export async function endLiveActivity(gameId: string): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.end({ gameId });
  } catch (err) {
    console.warn("[LiveActivity] end failed:", err);
  }
}

/** Subscribe to per-Activity push tokens the OS hands the device.
 *  Returns an unsubscribe fn (a no-op off-native). */
export async function addLiveActivityPushTokenListener(
  cb: (data: LiveActivityPushTokenEvent) => void
): Promise<() => void> {
  const plugin = getPlugin();
  if (!plugin) return () => {};
  try {
    const handle = await plugin.addListener("pushToken", cb);
    return () => {
      void handle.remove();
    };
  } catch (err) {
    console.warn("[LiveActivity] addListener failed:", err);
    return () => {};
  }
}

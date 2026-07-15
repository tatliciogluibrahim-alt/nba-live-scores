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
// the `sandbox` flag we store at register time.
//
// Flipped to `false` for the v1 TestFlight / App Store build. If you
// need to debug Live Activity push from a Xcode debug install again,
// flip back to `true` temporarily (and remember to flip it back before
// the next Archive).
//
// (When the native plugin later reports its own aps-environment, this
// constant can be replaced by that runtime value. Until then it's the
// single source of truth and easy to find.)
export const LIVE_ACTIVITY_SANDBOX = false;

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
  /** No-Spoilers: when true, the lock-screen / Dynamic Island scores
   *  render as a hidden slug instead of the numbers. Set ONCE at start
   *  (it lives in the Activity's static attributes), so server-pushed
   *  score updates can't un-redact it. */
  redacted: boolean;
};

export type LiveActivityPushTokenEvent = { gameId: string; token: string };

export type ActiveLiveActivity = {
  gameId: string;
  /** `null` when an older native build can only report ids. */
  redacted: boolean | null;
};

type PluginListenerHandle = { remove: () => void | Promise<void> };

type LiveActivityPlugin = {
  start(opts: LiveActivityStartInput): Promise<{ id: string }>;
  end(opts: { gameId: string }): Promise<void>;
  getActiveGameIds(): Promise<{ gameIds: string[] }>;
  /** Richer persisted-state read added after v1.0.2. Optional so an older
   *  App Store build falls back to getActiveGameIds(). */
  getActiveActivities?(): Promise<{
    activities: Array<{ gameId: string; redacted: boolean }>;
  }>;
  /** Clears the device-local Live Activity reveal flag before a newly-hidden
   *  activity restarts. Optional for backward compatibility. */
  clearReveal?(opts: { gameId: string }): Promise<void>;
  /** Preflight: are Live Activities enabled in iOS Settings? Optional so an
   *  older native build shipped before this method degrades to `null`
   *  (unknown) rather than crashing the dispatch. */
  areActivitiesEnabled?(): Promise<{ enabled: boolean }>;
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

/** Preflight for the docking control: whether the user has Live Activities
 *  enabled in iOS Settings. Lets the UI show the honest "Turn on Live
 *  Activities" state instead of a silent failure when a start would be
 *  rejected. Returns:
 *    • `null`  — can't know (off-native, or an older build without the
 *                method). Callers treat null as "proceed and let start()
 *                report the truth", never as denied.
 *    • `true`  — enabled.
 *    • `false` — the OS reports Live Activities are off in Settings.
 *  getPlugin() is SYNC (see its comment) — do not await it, or the Capacitor
 *  proxy's phantom `.then` dispatch hangs forever. */
export async function areLiveActivitiesEnabled(): Promise<boolean | null> {
  const plugin = getPlugin();
  if (!plugin) return null;
  try {
    if (typeof plugin.areActivitiesEnabled !== "function") return null;
    const res = await plugin.areActivitiesEnabled();
    return res?.enabled ?? null;
  } catch (err) {
    console.warn("[LiveActivity] areActivitiesEnabled failed:", err);
    return null;
  }
}

/** End the Live Activity for a game (final / unpinned). Returns false when
 *  native cleanup did not complete, so callers retain state and retry. */
export async function endLiveActivity(gameId: string): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    await plugin.end({ gameId });
    return true;
  } catch (err) {
    console.warn("[LiveActivity] end failed:", err);
    return false;
  }
}

/** gameIds of Live Activities the OS currently has running. Survives app
 *  kills/relaunches (ActivityKit persists activities), so the web lifecycle
 *  can seed its in-memory "already started" set on mount and avoid asking
 *  the native plugin to start a duplicate. Returns [] off-native / on error. */
export async function getActiveLiveActivityGameIds(): Promise<string[]> {
  const plugin = getPlugin();
  if (!plugin) return [];
  try {
    const res = await plugin.getActiveGameIds();
    return res?.gameIds ?? [];
  } catch (err) {
    console.warn("[LiveActivity] getActiveGameIds failed:", err);
    return [];
  }
}

/** Active ActivityKit games plus their static redaction attribute. Newer
 *  native builds return the full shape. Older builds reject the unknown
 *  method, so we fall back to ids with `redacted: null`; the reconcile loop
 *  then performs one safe restart to establish the current preference. */
export async function getActiveLiveActivities(): Promise<ActiveLiveActivity[]> {
  const plugin = getPlugin();
  if (!plugin) return [];
  try {
    if (typeof plugin.getActiveActivities === "function") {
      const res = await plugin.getActiveActivities();
      if (Array.isArray(res?.activities)) {
        return res.activities
          .filter((item) => typeof item?.gameId === "string" && item.gameId)
          .map((item) => ({
            gameId: item.gameId,
            redacted: Boolean(item.redacted),
          }));
      }
    }
  } catch {
    // Older native build. Fall through to the id-only method.
  }

  const ids = await getActiveLiveActivityGameIds();
  return ids.map((gameId) => ({ gameId, redacted: null }));
}

/** Forget a prior lock-screen reveal when No-Spoilers is newly enabled for
 *  the game. False means this native build cannot guarantee the reset, so a
 *  redacted replacement must not start. */
export async function clearLiveActivityReveal(
  gameId: string
): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    if (typeof plugin.clearReveal !== "function") return false;
    await plugin.clearReveal({ gameId });
    return true;
  } catch (err) {
    // An older native proxy can expose any property as a callable function
    // and then reject the unknown method. Report false so privacy wins.
    console.warn("[LiveActivity] clearReveal unavailable:", err);
    return false;
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

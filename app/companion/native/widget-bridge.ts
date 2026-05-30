"use client";

import { registerPlugin } from "@capacitor/core";
import { isCapacitorNative } from "../dev/native-detect";

// Web-side bridge to the native `WidgetBridge` Capacitor plugin
// (ios/App/App/WidgetBridgePlugin.swift). The plugin writes a compact
// snapshot into the App Group shared container that the home-screen
// widget (NoNoiseWidgets extension) reads and renders.
//
// Home-screen widgets can't read the PWA's localStorage and iOS throttles
// their refreshes, so we don't try to make them "live". Instead the web
// app — which already computes the user's upcoming followed games + the
// moment line for Today — writes that calm snapshot here whenever it
// changes. The widget renders the last snapshot and recomputes nothing
// it can't (no network, never throttled-stale).
//
// Everything here is a no-op off-native (and until the Swift plugin +
// App Group exist): registerPlugin returns a proxy that simply rejects,
// and we swallow it. Safe to ship before the native half lands — the
// proven LiveActivity pattern.
//
// Plugin-name contract: the Swift side MUST register under "WidgetBridge".

const PLUGIN_NAME = "WidgetBridge";

/** One upcoming followed game, display-ready. Mirrors the Swift
 *  `WidgetUpcoming` decodable — keep the field names in lockstep. */
export type WidgetUpcoming = {
  id: string;
  sport: "nba" | "wc" | "nfl";
  /** "NBA · Sat" */
  eyebrow: string;
  /** "OKC vs SA" */
  matchup: string;
  /** "8:00 PM · Game 7" */
  detail: string;
  /** Broadcast channel, e.g. "NBC". Optional — shown as a pill. */
  broadcast?: string;
  /** Sport accent hex, e.g. "#e55b2a". */
  accentHex: string;
  /** Deep-link path into the app, e.g. "/game/123". */
  href: string;
};

/** The whole widget snapshot. Mirrors the Swift `WidgetSnapshot`. */
export type WidgetSnapshot = {
  /** epoch ms — when this snapshot was written. */
  generatedAt: number;
  /** Up to ~3 upcoming followed games, soonest first. */
  upcoming: WidgetUpcoming[];
  /** The overall moment line, e.g. "World Cup kicks off in 14 days." */
  moment: { text: string; detail?: string } | null;
  /** True when the user has nothing to show (no follows / nothing up). */
  empty: boolean;
};

type WidgetBridgePlugin = {
  /** Persist the snapshot to the App Group + reload widget timelines. */
  setSnapshot(opts: { json: string }): Promise<void>;
};

let plugin: WidgetBridgePlugin | null | undefined;

function getPlugin(): WidgetBridgePlugin | null {
  if (plugin !== undefined) return plugin;
  if (!isCapacitorNative()) {
    plugin = null;
    return null;
  }
  try {
    plugin = registerPlugin<WidgetBridgePlugin>(PLUGIN_NAME);
    return plugin;
  } catch {
    plugin = null;
    return null;
  }
}

/** Write the snapshot to the native widget store. No-op off-native. */
export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  const p = getPlugin();
  if (!p) return;
  try {
    await p.setSnapshot({ json: JSON.stringify(snapshot) });
  } catch (err) {
    console.warn("[Widget] setSnapshot failed:", err);
  }
}

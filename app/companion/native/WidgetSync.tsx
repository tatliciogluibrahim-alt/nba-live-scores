"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFollows, usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { isCapacitorNative } from "../dev/native-detect";
import {
  buildTodayPayload,
  type NBAGame,
  type WCGameLite,
  type UpNextItem,
} from "../today/today-data";
import { writeWidgetSnapshot, type WidgetSnapshot, type WidgetUpcoming } from "./widget-bridge";

// WidgetSync — invisible, mounted globally beside LiveActivitySync. The
// web half of the home-screen widget (Phase 22.5-4).
//
// Job: keep the native widget's App Group snapshot in step with the
// user's upcoming followed games + the moment line. It reuses the exact
// Today payload builder, so the widget shows the same "Upcoming" +
// "Reminder" the Today screen does.
//
// Native-only: the poll is disabled off-native, and writeWidgetSnapshot
// is a guaranteed no-op on web / desktop. Safe to ship before the Swift
// plugin + App Group exist — it just does nothing until a build that
// includes them runs.

const REFRESH_MS = 30 * 60 * 1000; // upcoming/moments don't change fast

const ACCENT_NBA = "#e55b2a";
const ACCENT_WC = "#1e6b3c";

async function fetchNBA(): Promise<NBAGame[]> {
  try {
    const res = await fetch("/api/live-scores", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: NBAGame[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

async function fetchWC(): Promise<WCGameLite[]> {
  try {
    const res = await fetch(wcFeedUrl(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: WCGameLite[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

function itemToUpcoming(item: UpNextItem): WidgetUpcoming {
  const sport: WidgetUpcoming["sport"] = item.source === "wc" ? "wc" : "nba";
  return {
    id: item.id,
    sport,
    eyebrow: item.eyebrow,
    matchup: item.headline,
    detail: item.detail,
    broadcast: item.watch?.channel,
    accentHex: sport === "wc" ? ACCENT_WC : ACCENT_NBA,
    href: item.href,
  };
}

export function WidgetSync() {
  const { follows } = useFollows();
  const { pinned, hydrated } = usePinned();

  // Stable refs the poll closure reads without re-subscribing.
  const followsRef = useRef(follows);
  const pinnedRef = useRef(pinned);
  useEffect(() => {
    followsRef.current = follows;
  }, [follows]);
  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  const writeSnapshot = useCallback(async () => {
    const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
    const payload = buildTodayPayload({
      nba,
      wc,
      follows: followsRef.current,
      pinned: pinnedRef.current,
    });

    // Widget respects follows strictly: only personal games (followed
    // team / country / series / tournament) reach the home-screen tile.
    // When the user has nothing personal, the widget falls back to the
    // moment line (or its empty CTA). Cap at 5 so the medium widget can
    // page through a couple more games before wrapping.
    const upcoming = payload.upNext
      .filter((item) => item.personal)
      .slice(0, 5)
      .map(itemToUpcoming);
    const moment = payload.reminder
      ? { text: payload.reminder.text, detail: payload.reminder.detail }
      : null;

    const snapshot: WidgetSnapshot = {
      generatedAt: Date.now(),
      upcoming,
      moment,
      empty: upcoming.length === 0 && moment === null,
    };
    await writeWidgetSnapshot(snapshot);
  }, []);

  // Recompute + write whenever follows or pins change (cheap, native-only).
  useEffect(() => {
    if (!isCapacitorNative() || !hydrated) return;
    void writeSnapshot();
  }, [follows, pinned, hydrated, writeSnapshot]);

  // Slow refresh while the app is open so day-rollover / new fixtures
  // land in the widget. Disabled off-native.
  useVisibilityPoll(
    async () => {
      await writeSnapshot();
    },
    () => REFRESH_MS,
    isCapacitorNative() && hydrated
  );

  return null;
}

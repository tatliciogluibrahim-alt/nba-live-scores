"use client";

import { useEffect, useRef } from "react";
import { usePinned } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { isCapacitorNative } from "../dev/native-detect";
import type { NBAGame, WCGameLite } from "../today/today-data";
import { buildWatchingPayload, type PinnedItem } from "../watching/watching-data";
import {
  startLiveActivity,
  endLiveActivity,
  addLiveActivityPushTokenListener,
  LIVE_ACTIVITY_SANDBOX,
  type LiveActivityStartInput,
} from "./live-activity";
import type { PinnedGame } from "../state/types";

// LiveActivitySync — invisible, mounted globally beside
// CapacitorPushBootstrap. The web half of Phase 22.5-3.
//
// Job: keep ActivityKit Live Activities in lockstep with the user's
// pinned-and-live games.
//   • A pinned game goes live  → start a Live Activity on the device,
//     forward its per-Activity push token to /api/push/register-live-activity.
//   • That game ends / is unpinned → end the Activity + deregister the token.
//
// The server-side scan (sendApnsLiveActivity) drives the real-time score
// updates between start and end — this component only owns the lifecycle
// edges, which must happen on-device (ActivityKit requires the app to
// call Activity.request itself).
//
// Entirely native-only: the poll is disabled unless isCapacitorNative()
// AND the user has pins, so web / desktop PWA users never fetch here and
// every live-activity call is a guaranteed no-op off-native. Safe to
// deploy before the Swift plugin exists — it just does nothing until a
// build that includes it runs.

// Bump this each deploy so the Xcode console tells us at a glance whether
// the device is running the current bundle vs a stale cached one. Look
// for "BUILD=LA-v3" in the first [LiveActivitySync] poll line.
const BUILD_TAG = "LA-v3";

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;

// Cap concurrent Live Activities. iOS allows several, but a calm app
// shouldn't stack the lock screen — and it mirrors the "3" the user
// already knows from the free alert slots. When more than 3 pinned
// games are live at once, the soonest-pinned 3 get the Activity; the
// rest are tracked in Watching + via push.
const MAX_LIVE_ACTIVITIES = 3;

// Sport accent hexes (AGENTS palette). Matches the apns-sender default
// and the per-sport accents used across the app.
const ACCENT_NBA = "#e55b2a";
const ACCENT_WC = "#1e6b3c";
const ACCENT_NFL = "#1f3a6b";

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

function parseScore(line: string | null): { away: number; home: number } {
  if (!line) return { away: 0, home: 0 };
  const nums = line.match(/\d+/g);
  if (!nums || nums.length < 2) return { away: 0, home: 0 };
  return { away: Number(nums[0]), home: Number(nums[1]) };
}

function itemToStartInput(item: PinnedItem): LiveActivityStartInput {
  const { away, home } = parseScore(item.scoreLine);
  const sport: LiveActivityStartInput["sport"] =
    item.source === "wc" ? "wc" : "nba";
  return {
    gameId: item.id,
    // ActivityAttributes.matchup splits on " vs " on the Swift side.
    matchup: `${item.awayCode} vs ${item.homeCode}`,
    stage: item.contextEyebrow,
    sport,
    awayCode: item.awayCode,
    awayScore: away,
    homeCode: item.homeCode,
    homeScore: home,
    statusLine: item.detailLine,
    // Stake/context is filled by the server-side update push; the
    // initial activity opens without it rather than guessing here.
    subline: "",
    accentHex: sport === "wc" ? ACCENT_WC : ACCENT_NBA,
  };
}

async function postRegister(gameId: string, token: string): Promise<void> {
  try {
    await fetch("/api/push/register-live-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, token, sandbox: LIVE_ACTIVITY_SANDBOX }),
    });
  } catch (err) {
    console.warn("[LiveActivity] register POST failed:", err);
  }
}

async function postDeregister(token: string): Promise<void> {
  try {
    await fetch("/api/push/register-live-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, end: true }),
    });
  } catch (err) {
    console.warn("[LiveActivity] deregister POST failed:", err);
  }
}

// Silence the unused NFL accent until NFL games can be pinned (Phase 22).
void ACCENT_NFL;

export function LiveActivitySync() {
  const { pinned, hydrated } = usePinned();

  // Stable refs the poll closure reads without re-subscribing.
  const pinnedRef = useRef<PinnedGame[]>(pinned);
  const startedRef = useRef<Set<string>>(new Set()); // gameIds with a live activity
  const inFlightRef = useRef<Set<string>>(new Set()); // start in progress
  const tokensRef = useRef<Map<string, string>>(new Map()); // gameId → push token
  const hasLiveRef = useRef(false);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  // Token listener — attach once. The native plugin streams the
  // per-Activity push token (it can rotate, so we always store + POST
  // the latest). No-op off-native.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const remove = await addLiveActivityPushTokenListener(({ gameId, token }) => {
        tokensRef.current.set(gameId, token);
        void postRegister(gameId, token);
      });
      if (cancelled) {
        remove();
        return;
      }
      unsub = remove;
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  // Lifecycle poll. Disabled unless native + hydrated + something pinned,
  // so web users and pin-less users never fetch.
  useVisibilityPoll(
    async (isCancelled) => {
      const [nba, wc] = await Promise.all([fetchNBA(), fetchWC()]);
      if (isCancelled()) return;

      const { items } = buildWatchingPayload({
        nba,
        wc,
        pinned: pinnedRef.current,
      });
      const liveItems = items.filter((i) => i.status === "live");
      const liveIds = new Set(liveItems.map((i) => i.id));
      hasLiveRef.current = liveItems.length > 0;

      // Diagnostics for the Live Activity P0 — remove once verified.
      console.log(
        `[LiveActivitySync] poll BUILD=${BUILD_TAG} nba=${nba.length} wc=${wc.length} pinned=${pinnedRef.current.length} live=${liveItems.length}`,
        { pinnedIds: pinnedRef.current.map((p) => p.gameId), liveIds: [...liveIds] }
      );

      // Start activities for newly-live pins, capped at MAX. liveItems
      // arrives in pinned order, so the first 3 win the lock screen.
      for (const item of liveItems) {
        if (startedRef.current.has(item.id) || inFlightRef.current.has(item.id)) {
          continue;
        }
        if (startedRef.current.size + inFlightRef.current.size >= MAX_LIVE_ACTIVITIES) {
          break;
        }
        inFlightRef.current.add(item.id);
        console.log(`[LiveActivitySync] starting LA for ${item.id}`);
        const ok = await startLiveActivity(itemToStartInput(item));
        console.log(`[LiveActivitySync] start ${item.id} → ${ok}`);
        inFlightRef.current.delete(item.id);
        if (isCancelled()) return;
        if (ok) startedRef.current.add(item.id);
      }

      // End activities for games that are no longer live-pinned.
      for (const gameId of Array.from(startedRef.current)) {
        if (liveIds.has(gameId)) continue;
        await endLiveActivity(gameId);
        const token = tokensRef.current.get(gameId);
        if (token) {
          await postDeregister(token);
          tokensRef.current.delete(gameId);
        }
        startedRef.current.delete(gameId);
      }
    },
    () => (hasLiveRef.current ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS),
    isCapacitorNative() && hydrated && pinned.length > 0
  );

  return null;
}

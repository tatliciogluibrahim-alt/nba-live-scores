"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePinned, useUserPrefs, useFollows } from "../providers";
import { wcFeedUrl } from "../dev/preview-mode";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import { isCapacitorNative } from "../dev/native-detect";
import type { NBAGame, WCGameLite } from "../today/today-data";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import { buildWatchingPayload, type PinnedItem } from "../watching/watching-data";
import {
  startLiveActivity,
  endLiveActivity,
  clearLiveActivityReveal,
  addLiveActivityPushTokenListener,
  getActiveLiveActivities,
  LIVE_ACTIVITY_SANDBOX,
  type LiveActivityStartInput,
} from "./live-activity";
import { postWithRetry } from "../push/register-state";
import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { deriveSubline } from "./live-activity-subline";
import type { Follow, PinnedGame } from "../state/types";
import { MAX_LOCK_SCREEN_SLOTS } from "../system/lock-screen-slots";
import { followHidesParticipants } from "../spoiler/follow-match";
import {
  planLiveActivityReconciliation,
  type ActiveLiveActivityState,
} from "./live-activity-reconcile";

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

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;

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

async function fetchNFL(): Promise<NFLGameLite[]> {
  try {
    const res = await fetch("/api/nfl-scores", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: NFLGameLite[] };
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

function itemToStartInput(
  item: PinnedItem,
  redacted: boolean
): LiveActivityStartInput {
  const { away, home } = parseScore(item.scoreLine);
  // item.source is already the sport (nba | wc | nfl) — pass it through so an
  // NFL Live Activity gets the right accent + 15-minute-quarter progress.
  const sport: LiveActivityStartInput["sport"] = item.source;
  const status: "live" | "upcoming" | "final" = item.status;
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
    // Center-bug context line. Server may refine on the first update;
    // we seed it from the contextEyebrow so the tile reads correctly
    // the moment it opens.
    subline: deriveSubline(item.contextEyebrow),
    accentHex:
      sport === "wc" ? ACCENT_WC : sport === "nfl" ? ACCENT_NFL : ACCENT_NBA,
    // Initial Stadium Panel rail value so the activity opens at the
    // right point in the match instead of starting at 0.
    progress: computeLiveActivityProgress(sport, item.detailLine, status),
    redacted,
  };
}

// Decide whether a pinned game's Live Activity should hide its score.
// Mirrors the in-app No-Spoilers decision: redact when the global mode
// is on, or when a per-follow `hideSpoilers` covers either team / the
// series. Set once at start (static attribute), so a server score update
// can't reveal it. If the user wants pinning to override No-Spoilers,
// that's a separate future choice — this keeps the lock screen
// consistent with what the app shows.
function gameIsHidden(
  item: PinnedItem,
  noSpoilers: boolean,
  follows: readonly Follow[]
): boolean {
  if (noSpoilers) return true;
  return followHidesParticipants(
    follows,
    item.source === "wc"
      ? { countryCodes: [item.awayCode, item.homeCode], sport: "wc" }
      : { teamCodes: [item.awayCode, item.homeCode], sport: item.source }
  );
}

async function postRegister(gameId: string, token: string): Promise<void> {
  await postWithRetry({
    kind: "live-activity",
    endpoint: "/api/push/register-live-activity",
    token,
    body: { gameId, token, sandbox: LIVE_ACTIVITY_SANDBOX },
  });
}

async function postDeregister(token: string): Promise<void> {
  // Deregister is best-effort with retry; failure here doesn't leave the
  // user stuck (the server prunes dead tokens on the next APNs 410).
  await postWithRetry({
    kind: "live-activity",
    endpoint: "/api/push/register-live-activity",
    token,
    body: { token, end: true },
    attempts: 2,
  });
}

// Silence the unused NFL accent until NFL games can be pinned (Phase 22).

export function LiveActivitySync() {
  const { pinned, hydrated } = usePinned();
  const { prefs } = useUserPrefs();
  const { follows } = useFollows();

  // Stable refs the poll closure reads without re-subscribing.
  const pinnedRef = useRef<PinnedGame[]>(pinned);
  // gameId → the static redaction attribute currently on the Activity.
  // `null` means an older native build reported only the id; the first
  // reconcile restarts it once so current spoiler state becomes certain.
  const activeRef = useRef<Map<string, ActiveLiveActivityState>>(new Map());
  const tokensRef = useRef<Map<string, string>>(new Map()); // gameId → push token
  const liveItemsRef = useRef<PinnedItem[]>([]);
  // ActivityKit mutations are serialized. This prevents a preference
  // change, an unpin, and the live-data poll from ending/starting the same
  // tile concurrently and losing its token lifecycle.
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const seedPromiseRef = useRef<Promise<void> | null>(null);
  const hasLiveRef = useRef(false);
  // No-Spoilers state the start loop reads to decide redaction. Refs so
  // a prefs/follows change doesn't re-subscribe the poll.
  const noSpoilersRef = useRef(prefs.noSpoilers);
  const followsRef = useRef<Follow[]>(follows);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  const enqueueOperation = useCallback(
    (operation: () => Promise<void>): Promise<void> => {
      const next = operationQueueRef.current.then(operation, operation);
      const guarded = next.catch((err) => {
        console.warn("[LiveActivity] reconciliation failed:", err);
      });
      operationQueueRef.current = guarded;
      return guarded;
    },
    []
  );

  const stopTrackedActivity = useCallback(async (gameId: string) => {
    const ended = await endLiveActivity(gameId);
    if (!ended) return false;
    const token = tokensRef.current.get(gameId);
    if (token) {
      try {
        await postDeregister(token);
      } finally {
        tokensRef.current.delete(gameId);
      }
    }
    activeRef.current.delete(gameId);
    return true;
  }, []);

  const reconcileActivities = useCallback(
    async (sourceItems: PinnedItem[]) => {
      // The mount seed runs before lifecycle decisions so an Activity that
      // survived an app kill is never mistaken for an empty slot.
      if (seedPromiseRef.current) await seedPromiseRef.current;

      // A poll can have been queued just before an unpin. Filter again at
      // execution time so stale work can never restart a removed game.
      const pinnedIds = new Set(pinnedRef.current.map((pin) => pin.gameId));
      const desiredInOrder = sourceItems
        .filter((item) => pinnedIds.has(item.id))
        .map((item) => {
          const redacted = gameIsHidden(
            item,
            noSpoilersRef.current,
            followsRef.current
          );
          return { gameId: item.id, redacted, value: item };
        });

      const plan = planLiveActivityReconciliation(
        desiredInOrder,
        activeRef.current,
        MAX_LOCK_SCREEN_SLOTS
      );

      // End overflow/stale/mismatched activities FIRST. Starting before
      // eviction can leave the old three in ActivityKit and make the app's
      // slot meter disagree with the lock screen.
      let everyEndCompleted = true;
      for (const gameId of plan.endGameIds) {
        const ended = await stopTrackedActivity(gameId);
        if (!ended) everyEndCompleted = false;
      }
      // Do not start replacements while ActivityKit may still hold a stale
      // or unredacted tile. The next visibility pass retries cleanup.
      if (!everyEndCompleted) return;

      // A lock-screen reveal is device-local and persisted in the App Group.
      // When hiding is newly enabled, clear it before the replacement starts
      // or the new redacted Activity would immediately reveal itself again.
      const unsafeToRestart = new Set<string>();
      for (const gameId of plan.clearRevealGameIds) {
        const cleared = await clearLiveActivityReveal(gameId);
        if (!cleared) unsafeToRestart.add(gameId);
      }

      for (const desired of plan.start) {
        if (unsafeToRestart.has(desired.gameId)) continue;
        const ok = await startLiveActivity(
          itemToStartInput(desired.value, desired.redacted)
        );
        if (ok) activeRef.current.set(desired.gameId, desired.redacted);
      }
    },
    [stopTrackedActivity]
  );

  const queueReconcile = useCallback(
    (items: PinnedItem[]) =>
      enqueueOperation(() => reconcileActivities(items)),
    [enqueueOperation, reconcileActivities]
  );

  useEffect(() => {
    noSpoilersRef.current = prefs.noSpoilers;
    followsRef.current = follows;

    // `redacted` is a static Activity attribute. Reconcile immediately on
    // a global/selective change rather than waiting up to a minute for the
    // data poll, so a lock-screen score cannot linger after hiding is on.
    if (
      isCapacitorNative() &&
      hydrated &&
      (liveItemsRef.current.length > 0 || activeRef.current.size > 0)
    ) {
      void queueReconcile(liveItemsRef.current);
    }
  }, [prefs.noSpoilers, follows, hydrated, queueReconcile]);

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

  // Seed activeRef from the OS-persisted Live Activities on mount.
  // ActivityKit activities survive app kills/relaunches, but activeRef is
  // in-memory and starts empty every launch. Without seeding, the poll
  // would see a still-live pinned game with an empty activeRef and start a
  // SECOND activity for one that already exists. Asking the native plugin
  // which game activities are already running closes that gap. (Native
  // start() is also idempotent across launches as a backstop.)
  useEffect(() => {
    if (!isCapacitorNative()) return;
    let cancelled = false;
    const privacyEndTimers = new Set<ReturnType<typeof setTimeout>>();
    const seed = (async () => {
      const active = await getActiveLiveActivities();
      if (cancelled) return;
      for (const item of active) {
        activeRef.current.set(item.gameId, item.redacted);
      }

      // Privacy must not wait for either sports feed. On a cold launch, end
      // every persisted tile that is not provably redacted as soon as the OS
      // state is known. The normal poll can later restart safe desired tiles.
      const privacyActive =
        noSpoilersRef.current ||
        followsRef.current.some((follow) => follow.hideSpoilers);
      if (privacyActive) {
        const endUnsafeWithRetry = async (gameId: string): Promise<void> => {
          const ended = await stopTrackedActivity(gameId);
          if (ended || cancelled) return;
          const timer = setTimeout(() => {
            privacyEndTimers.delete(timer);
            if (!cancelled) void endUnsafeWithRetry(gameId);
          }, 5_000);
          privacyEndTimers.add(timer);
        };
        for (const item of active) {
          if (item.redacted !== true) await endUnsafeWithRetry(item.gameId);
        }
      }
    })();
    seedPromiseRef.current = seed;
    return () => {
      cancelled = true;
      for (const timer of privacyEndTimers) clearTimeout(timer);
      privacyEndTimers.clear();
    };
  }, [stopTrackedActivity]);

  // Unpin cleanup. The visibility poll below is gated on pinned.length > 0,
  // so the moment the user unpins the last game the poll disables — and
  // its end-loop never gets to dismiss the activity for the game that
  // just left pinned. This separate effect handles that: whenever the
  // pinned set changes, end any tracked activity whose gameId is no
  // longer pinned. Runs independently of the poll.
  useEffect(() => {
    if (!isCapacitorNative() || !hydrated) return;
    let cancelled = false;
    const retryTimers = new Set<ReturnType<typeof setTimeout>>();
    const pinnedIds = new Set(pinned.map((p) => p.gameId));
    void enqueueOperation(async () => {
      if (seedPromiseRef.current) await seedPromiseRef.current;

      const stopWithRetry = async (gameId: string): Promise<void> => {
        const ended = await stopTrackedActivity(gameId);
        if (ended || cancelled) return;
        const timer = setTimeout(() => {
          retryTimers.delete(timer);
          if (!cancelled) {
            void enqueueOperation(() => stopWithRetry(gameId));
          }
        }, 5_000);
        retryTimers.add(timer);
      };

      for (const gameId of Array.from(activeRef.current.keys())) {
        if (!pinnedIds.has(gameId)) {
          await stopWithRetry(gameId);
        }
      }
    });
    return () => {
      cancelled = true;
      for (const timer of retryTimers) clearTimeout(timer);
      retryTimers.clear();
    };
  }, [pinned, hydrated, enqueueOperation, stopTrackedActivity]);

  // Lifecycle poll. Disabled unless native + hydrated + something pinned,
  // so web users and pin-less users never fetch.
  useVisibilityPoll(
    async (isCancelled) => {
      const [nba, wc, nfl] = await Promise.all([fetchNBA(), fetchWC(), fetchNFL()]);
      if (isCancelled()) return;

      const { items } = buildWatchingPayload({
        nba,
        wc,
        nfl,
        pinned: pinnedRef.current,
      });
      const liveItems = items.filter((i) => i.status === "live");
      liveItemsRef.current = liveItems;
      hasLiveRef.current = liveItems.length > 0;
      await queueReconcile(liveItems);
    },
    () => (hasLiveRef.current ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS),
    isCapacitorNative() && hydrated && pinned.length > 0
  );

  return null;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_PREFS,
  MAX_FREE_ALERT_SLOTS,
  type AlertPreset,
  type Follow,
  type FollowKind,
  type PinnedGame,
  type UserPrefs,
} from "./state/types";
import {
  STORAGE_KEYS,
  normalizeStoredFollows,
  normalizeStoredPinned,
  normalizeStoredPrefs,
  readJSON,
  writeJSON,
} from "./state/storage";
import { PushSyncEffect } from "./push/PushSyncEffect";
import { CapacitorPushBootstrap } from "./push/CapacitorPushBootstrap";
import dynamic from "next/dynamic";
import { RevealProvider } from "./spoiler/reveal";

// Native-only sync components pull @capacitor/core (~24KB) and the
// LiveActivity/Widget bridges, all of which early-return on the web /
// desktop PWA (isCapacitorNative gate). Onboarding renders null for
// returning users. Loading them lazily (client-only) keeps that code
// out of the eager Today chunk so it never parses where it can't run.
const LiveActivitySync = dynamic(
  () => import("./native/LiveActivitySync").then((m) => m.LiveActivitySync),
  { ssr: false }
);
const WidgetSync = dynamic(
  () => import("./native/WidgetSync").then((m) => m.WidgetSync),
  { ssr: false }
);
const OnboardingFlow = dynamic(
  () => import("./onboarding/OnboardingFlow").then((m) => m.OnboardingFlow),
  { ssr: false }
);

// ─── Follows ──────────────────────────────────────────────────────────
type FollowsCtx = {
  follows: Follow[];
  alertSlotCount: number;
  alertSlotCap: number;
  isFollowing: (kind: FollowKind, id: string) => boolean;
  addFollow: (kind: FollowKind, id: string, preset?: AlertPreset) => void;
  removeFollow: (kind: FollowKind, id: string) => void;
  setFollowAlertEnabled: (kind: FollowKind, id: string, enabled: boolean) => void;
  setFollowAlertTier: (kind: FollowKind, id: string, preset: AlertPreset) => void;
  setFollowHideSpoilers: (kind: FollowKind, id: string, value: boolean) => void;
  hydrated: boolean;
};

const FollowsContext = createContext<FollowsCtx | null>(null);

export function useFollows(): FollowsCtx {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error("useFollows must be used inside CompanionProviders");
  return ctx;
}

// ─── Pinned games ─────────────────────────────────────────────────────
type PinnedCtx = {
  pinned: PinnedGame[];
  isPinned: (gameId: string) => boolean;
  pinGame: (gameId: string) => void;
  unpinGame: (gameId: string) => void;
  hydrated: boolean;
};

const PinnedContext = createContext<PinnedCtx | null>(null);

export function usePinned(): PinnedCtx {
  const ctx = useContext(PinnedContext);
  if (!ctx) throw new Error("usePinned must be used inside CompanionProviders");
  return ctx;
}

// ─── User prefs (No-Spoilers, quiet hours, reminder window) ──────────
type PrefsCtx = {
  prefs: UserPrefs;
  setNoSpoilers: (value: boolean) => void;
  setLockScreenOffers: (value: boolean) => void;
  setRemindBeforeMinutes: (minutes: number) => void;
  setQuietHours: (range: { start: string; end: string } | undefined) => void;
  /** Records the YYYY-MM-DD the user dismissed the Quiet Recap card, so
   *  the recap won't re-render on subsequent opens that day. */
  markQuietRecapSeen: (yyyymmdd: string) => void;
  /** Default tier for newly-added follows. Existing follows keep their
   *  own per-follow alert levels. */
  setDefaultAlertTier: (preset: AlertPreset) => void;
  /** One-way flag. Set when the user either enables notifications or
   *  taps "Not now" on the Today prompt card. Once set, the prompt card
   *  never re-appears for that browser/install. */
  dismissNotifPrompt: () => void;
  /** Dismiss the first-run onboarding strip on Today. */
  dismissFirstRun: () => void;
  /** Dismiss the PWA install prompt card on Today. One-way flag. */
  dismissInstallPrompt: () => void;
  /** Dismiss the push-permission recovery card on Today. One-way
   *  flag. Distinct from `dismissNotifPrompt`: that one gates the
   *  initial Enable card (permission "default"). This one gates the
   *  Phase 21C recovery card (permission "denied"). */
  dismissPushRecovery: () => void;
  /** Mark the first-run onboarding flow finished (or skipped). One-way. */
  completeOnboarding: () => void;
  /** Mark the inline first-follow tier education card as seen. Called
   *  after the user picks a tier or taps "Looks good" on the card.
   *  One-way flag; the card never appears again. */
  markFirstFollowEducated: () => void;
  hydrated: boolean;
};

const PrefsContext = createContext<PrefsCtx | null>(null);

export function useUserPrefs(): PrefsCtx {
  const ctx = useContext(PrefsContext);
  if (!ctx)
    throw new Error("useUserPrefs must be used inside CompanionProviders");
  return ctx;
}

/** Convenience hook for the most common pref read. */
export function useNoSpoilers(): boolean {
  return useUserPrefs().prefs.noSpoilers;
}

// ─── Composed provider ────────────────────────────────────────────────
export function CompanionProviders({ children }: { children: ReactNode }) {
  // Hydration-safe pattern: render with defaults on the server, then hydrate
  // from localStorage on the client. `hydrated` lets consumers avoid flashing
  // the wrong state.
  const [follows, setFollows] = useState<Follow[]>([]);
  const [pinned, setPinned] = useState<PinnedGame[]>([]);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  // One-time localStorage hydration on client mount.
  // The React 19 `set-state-in-effect` rule discourages this pattern, but it's
  // the documented Next.js / React solution for syncing browser-only state
  // (localStorage) into render — the alternative (lazy initializer) breaks
  // SSR hydration matching. We render with defaults on the server, then
  // upgrade once on the client.
  useEffect(() => {
    const storedFollows = normalizeStoredFollows(
      readJSON<unknown>(STORAGE_KEYS.follows, [])
    );
    const rawPinned = normalizeStoredPinned(
      readJSON<unknown>(STORAGE_KEYS.pinned, [])
    );

    // Auto-unpin stale pins to keep Watching tidy (user feedback 2026-05-28).
    // Keyed on pinnedAt age, but the window is 4 days, not 24h: "pinned for
    // later" is a supported state, and a 24h cutoff dropped a WC match pinned
    // a couple days before kickoff — before it had even been played. 4 days
    // covers pinning a few days out plus a day of post-game grace.
    const STALE_PIN_MS = 4 * 24 * 60 * 60 * 1000;
    const storedPinned = rawPinned.filter(
      (p) => Date.now() - p.pinnedAt < STALE_PIN_MS
    );

    const storedPrefs = normalizeStoredPrefs(
      readJSON<unknown>(STORAGE_KEYS.prefs, DEFAULT_PREFS)
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollows(storedFollows);
    setPinned(storedPinned);
    setPrefs(storedPrefs);
    writeJSON(STORAGE_KEYS.follows, storedFollows);
    writeJSON(STORAGE_KEYS.pinned, storedPinned);
    writeJSON(STORAGE_KEYS.prefs, storedPrefs);
    setHydrated(true);

    // Register the service worker. iOS PWAs require this for
    // `registration.showNotification()` to work; without it, even granted
    // permission produces zero visible notifications on iPhone. Registration
    // is idempotent — calling it on every session is a no-op after the
    // first install. Failures are silently swallowed because there's
    // nothing the user can do about them.
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW registration failed — degrade silently. */
      });
    }

    function readStorageEventValue(raw: string | null): unknown {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEYS.follows) {
        setFollows(normalizeStoredFollows(readStorageEventValue(e.newValue)));
      }
      if (e.key === STORAGE_KEYS.pinned) {
        setPinned(normalizeStoredPinned(readStorageEventValue(e.newValue)));
      }
      if (e.key === STORAGE_KEYS.prefs) {
        setPrefs(normalizeStoredPrefs(readStorageEventValue(e.newValue)));
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // ── Follows actions ────────────────────────────────────────────────
  const isFollowing = useCallback(
    (kind: FollowKind, id: string) =>
      follows.some((f) => f.kind === kind && f.id === id),
    [follows]
  );

  const alertSlotCount = useMemo(
    () => follows.filter((f) => f.alertEnabled).length,
    [follows]
  );

  const addFollow = useCallback(
    (kind: FollowKind, id: string, preset?: AlertPreset) => {
      setFollows((prev) => {
        if (prev.some((f) => f.kind === kind && f.id === id)) return prev;
        const enabledCount = prev.filter((f) => f.alertEnabled).length;
        const tier = preset ?? prefs.defaultAlertTier;
        const next = [
          ...prev,
          {
            kind,
            id,
            alertEnabled: enabledCount < MAX_FREE_ALERT_SLOTS,
            alertTier: tier,
            followedAt: Date.now(),
          },
        ];
        writeJSON(STORAGE_KEYS.follows, next);
        return next;
      });
    },
    [prefs.defaultAlertTier]
  );

  const removeFollow = useCallback((kind: FollowKind, id: string) => {
    setFollows((prev) => {
      const next = prev.filter((f) => !(f.kind === kind && f.id === id));
      writeJSON(STORAGE_KEYS.follows, next);
      return next;
    });
  }, []);

  const setFollowAlertEnabled = useCallback(
    (kind: FollowKind, id: string, enabled: boolean) => {
      setFollows((prev) => {
        const current = prev.find((f) => f.kind === kind && f.id === id);
        if (!current) return prev;
        if (current.alertEnabled === enabled) return prev;
        if (enabled && prev.filter((f) => f.alertEnabled).length >= MAX_FREE_ALERT_SLOTS) {
          return prev;
        }
        const next = prev.map((f) =>
          f.kind === kind && f.id === id ? { ...f, alertEnabled: enabled } : f
        );
        writeJSON(STORAGE_KEYS.follows, next);
        return next;
      });
    },
    []
  );

  const setFollowAlertTier = useCallback(
    (kind: FollowKind, id: string, preset: AlertPreset) => {
      setFollows((prev) => {
        const next = prev.map((f) =>
          f.kind === kind && f.id === id ? { ...f, alertTier: preset } : f
        );
        writeJSON(STORAGE_KEYS.follows, next);
        return next;
      });
    },
    []
  );

  // Per-follow No-Spoilers (selective). Storing `undefined` rather than
  // `false` keeps the persisted follow shape clean for the common case.
  const setFollowHideSpoilers = useCallback(
    (kind: FollowKind, id: string, value: boolean) => {
      setFollows((prev) => {
        const next = prev.map((f) =>
          f.kind === kind && f.id === id
            ? { ...f, hideSpoilers: value ? true : undefined }
            : f
        );
        writeJSON(STORAGE_KEYS.follows, next);
        return next;
      });
    },
    []
  );

  // ── Pinned actions ─────────────────────────────────────────────────
  const isPinned = useCallback(
    (gameId: string) => pinned.some((p) => p.gameId === gameId),
    [pinned]
  );

  const pinGame = useCallback((gameId: string) => {
    setPinned((prev) => {
      if (prev.some((p) => p.gameId === gameId)) return prev;
      const next = [...prev, { gameId, pinnedAt: Date.now() }];
      writeJSON(STORAGE_KEYS.pinned, next);
      return next;
    });
  }, []);

  const unpinGame = useCallback((gameId: string) => {
    setPinned((prev) => {
      const next = prev.filter((p) => p.gameId !== gameId);
      writeJSON(STORAGE_KEYS.pinned, next);
      return next;
    });
  }, []);

  // ── Prefs actions ──────────────────────────────────────────────────
  const setNoSpoilers = useCallback((value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, noSpoilers: value };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const setLockScreenOffers = useCallback((value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, lockScreenOffers: value };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const setRemindBeforeMinutes = useCallback((minutes: number) => {
    setPrefs((prev) => {
      const next = { ...prev, remindBeforeMinutes: minutes };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const setQuietHours = useCallback(
    (range: { start: string; end: string } | undefined) => {
      setPrefs((prev) => {
        const next: UserPrefs = { ...prev };
        if (range) next.quietHours = range;
        else delete next.quietHours;
        writeJSON(STORAGE_KEYS.prefs, next);
        return next;
      });
    },
    []
  );

  const markQuietRecapSeen = useCallback((yyyymmdd: string) => {
    setPrefs((prev) => {
      const next: UserPrefs = { ...prev, quietRecapSeenDate: yyyymmdd };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const setDefaultAlertTier = useCallback((preset: AlertPreset) => {
    setPrefs((prev) => {
      if (prev.defaultAlertTier === preset) return prev;
      const next: UserPrefs = { ...prev, defaultAlertTier: preset };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const dismissNotifPrompt = useCallback(() => {
    setPrefs((prev) => {
      if (prev.notifPromptDismissed) return prev;
      const next: UserPrefs = { ...prev, notifPromptDismissed: true };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const dismissFirstRun = useCallback(() => {
    setPrefs((prev) => {
      if (prev.firstRunDismissed) return prev;
      const next: UserPrefs = { ...prev, firstRunDismissed: true };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const dismissInstallPrompt = useCallback(() => {
    setPrefs((prev) => {
      if (prev.installPromptDismissed) return prev;
      const next: UserPrefs = { ...prev, installPromptDismissed: true };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const dismissPushRecovery = useCallback(() => {
    setPrefs((prev) => {
      if (prev.pushRecoveryDismissed) return prev;
      const next: UserPrefs = { ...prev, pushRecoveryDismissed: true };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setPrefs((prev) => {
      if (prev.onboardingComplete) return prev;
      // Onboarding's step 3 ("Get quiet alerts for what you follow")
      // already covers what the FirstFollowTierCard would teach.
      // Flip the education flag too so onboarded users never see the
      // post-follow card on top of what they just read.
      const next: UserPrefs = {
        ...prev,
        onboardingComplete: true,
        firstFollowEducated: true,
      };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  const markFirstFollowEducated = useCallback(() => {
    setPrefs((prev) => {
      if (prev.firstFollowEducated) return prev;
      const next: UserPrefs = { ...prev, firstFollowEducated: true };
      writeJSON(STORAGE_KEYS.prefs, next);
      return next;
    });
  }, []);

  // ── Memoize context values to avoid downstream re-renders ──────────
  const followsValue = useMemo<FollowsCtx>(
    () => ({
      follows,
      alertSlotCount,
      alertSlotCap: MAX_FREE_ALERT_SLOTS,
      isFollowing,
      addFollow,
      removeFollow,
      setFollowAlertEnabled,
      setFollowAlertTier,
      setFollowHideSpoilers,
      hydrated,
    }),
    [
      follows,
      alertSlotCount,
      isFollowing,
      addFollow,
      removeFollow,
      setFollowAlertEnabled,
      setFollowAlertTier,
      setFollowHideSpoilers,
      hydrated,
    ]
  );

  const pinnedValue = useMemo<PinnedCtx>(
    () => ({
      pinned,
      isPinned,
      pinGame,
      unpinGame,
      hydrated,
    }),
    [pinned, isPinned, pinGame, unpinGame, hydrated]
  );

  const prefsValue = useMemo<PrefsCtx>(
    () => ({
      prefs,
      setNoSpoilers,
      setLockScreenOffers,
      setRemindBeforeMinutes,
      setQuietHours,
      markQuietRecapSeen,
      setDefaultAlertTier,
      dismissNotifPrompt,
      dismissFirstRun,
      dismissInstallPrompt,
      dismissPushRecovery,
      completeOnboarding,
      markFirstFollowEducated,
      hydrated,
    }),
    [
      prefs,
      setNoSpoilers,
      setLockScreenOffers,
      setRemindBeforeMinutes,
      setQuietHours,
      markQuietRecapSeen,
      setDefaultAlertTier,
      dismissNotifPrompt,
      dismissFirstRun,
      dismissInstallPrompt,
      dismissPushRecovery,
      completeOnboarding,
      markFirstFollowEducated,
      hydrated,
    ]
  );

  return (
    <FollowsContext.Provider value={followsValue}>
      <PinnedContext.Provider value={pinnedValue}>
        <PrefsContext.Provider value={prefsValue}>
          {/* Stage C: keeps the server-side subscription in sync with
              per-follow alert changes while the app is open. Renders nothing. */}
          <PushSyncEffect />
          {/* Phase 22.5-1: when the PWA runs inside the Capacitor iOS
              wrapper, requests APNs permission, registers the device,
              and POSTs the resulting token to /api/push/register-ios.
              No-op on web (Capacitor.getPlatform() returns "web"). */}
          <CapacitorPushBootstrap />
          {/* Phase 22.5-3 (web half): starts / ends ActivityKit Live
              Activities for pinned-and-live games and registers their
              per-Activity push tokens. Native-only — a guaranteed no-op
              on web / desktop PWA (and until the Swift plugin ships). */}
          <LiveActivitySync />
          {/* Phase 22.5-4 (web half): writes the upcoming-followed-games
              + moment snapshot into the App Group so the home-screen
              widget can render it. Native-only no-op until the Swift
              WidgetBridge plugin + App Group ship. */}
          <WidgetSync />
          {/* First-run onboarding overlay — shows once for truly-fresh
              installs (no follows, onboarding not completed). Renders
              above everything; no-op for returning users. */}
          <OnboardingFlow />
          {/* Session-scoped per-game reveal state for No-Spoilers mode.
              One reveal(gameId) un-hides a whole game's surfaces at once. */}
          <RevealProvider>{children}</RevealProvider>
        </PrefsContext.Provider>
      </PinnedContext.Provider>
    </FollowsContext.Provider>
  );
}

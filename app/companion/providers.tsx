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
  DEFAULT_ALERT_PRESET,
  DEFAULT_PREFS,
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

// ─── Follows ──────────────────────────────────────────────────────────
type FollowsCtx = {
  follows: Follow[];
  isFollowing: (kind: FollowKind, id: string) => boolean;
  addFollow: (kind: FollowKind, id: string, preset?: AlertPreset) => void;
  removeFollow: (kind: FollowKind, id: string) => void;
  setFollowPreset: (kind: FollowKind, id: string, preset: AlertPreset) => void;
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
  setRemindBeforeMinutes: (minutes: number) => void;
  setQuietHours: (range: { start: string; end: string } | undefined) => void;
  /** Records the YYYY-MM-DD the user dismissed the Quiet Recap card, so
   *  the recap won't re-render on subsequent opens that day. */
  markQuietRecapSeen: (yyyymmdd: string) => void;
  /** Set the global notification tier (Stage C). The dispatcher uses
   *  this value when deciding which events to fan out to this device. */
  setAlertPreset: (preset: AlertPreset) => void;
  /** One-way flag. Set when the user either enables notifications or
   *  taps "Not now" on the Today prompt card. Once set, the prompt card
   *  never re-appears for that browser/install. */
  dismissNotifPrompt: () => void;
  /** Dismiss the first-run onboarding strip on Today. */
  dismissFirstRun: () => void;
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
    const storedPinned = normalizeStoredPinned(
      readJSON<unknown>(STORAGE_KEYS.pinned, [])
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

  const addFollow = useCallback(
    (kind: FollowKind, id: string, preset: AlertPreset = DEFAULT_ALERT_PRESET) => {
      setFollows((prev) => {
        if (prev.some((f) => f.kind === kind && f.id === id)) return prev;
        const next = [...prev, { kind, id, alertPreset: preset }];
        writeJSON(STORAGE_KEYS.follows, next);
        return next;
      });
    },
    []
  );

  const removeFollow = useCallback((kind: FollowKind, id: string) => {
    setFollows((prev) => {
      const next = prev.filter((f) => !(f.kind === kind && f.id === id));
      writeJSON(STORAGE_KEYS.follows, next);
      return next;
    });
  }, []);

  const setFollowPreset = useCallback(
    (kind: FollowKind, id: string, preset: AlertPreset) => {
      setFollows((prev) => {
        const next = prev.map((f) =>
          f.kind === kind && f.id === id ? { ...f, alertPreset: preset } : f
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

  const setAlertPreset = useCallback((preset: AlertPreset) => {
    setPrefs((prev) => {
      if (prev.alertPreset === preset) return prev;
      const next: UserPrefs = { ...prev, alertPreset: preset };
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

  // ── Memoize context values to avoid downstream re-renders ──────────
  const followsValue = useMemo<FollowsCtx>(
    () => ({
      follows,
      isFollowing,
      addFollow,
      removeFollow,
      setFollowPreset,
      hydrated,
    }),
    [follows, isFollowing, addFollow, removeFollow, setFollowPreset, hydrated]
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
      setRemindBeforeMinutes,
      setQuietHours,
      markQuietRecapSeen,
      setAlertPreset,
      dismissNotifPrompt,
      dismissFirstRun,
      hydrated,
    }),
    [
      prefs,
      setNoSpoilers,
      setRemindBeforeMinutes,
      setQuietHours,
      markQuietRecapSeen,
      setAlertPreset,
      dismissNotifPrompt,
      dismissFirstRun,
      hydrated,
    ]
  );

  return (
    <FollowsContext.Provider value={followsValue}>
      <PinnedContext.Provider value={pinnedValue}>
        <PrefsContext.Provider value={prefsValue}>
          {/* Stage C: keeps the server-side subscription in sync with
              follows/tier changes while the app is open. Renders nothing. */}
          <PushSyncEffect />
          {children}
        </PrefsContext.Provider>
      </PinnedContext.Provider>
    </FollowsContext.Provider>
  );
}

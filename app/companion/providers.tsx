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
import { STORAGE_KEYS, readJSON, writeJSON } from "./state/storage";

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollows(readJSON<Follow[]>(STORAGE_KEYS.follows, []));
    setPinned(readJSON<PinnedGame[]>(STORAGE_KEYS.pinned, []));
    setPrefs(readJSON<UserPrefs>(STORAGE_KEYS.prefs, DEFAULT_PREFS));
    setHydrated(true);
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
      hydrated,
    }),
    [
      prefs,
      setNoSpoilers,
      setRemindBeforeMinutes,
      setQuietHours,
      markQuietRecapSeen,
      hydrated,
    ]
  );

  return (
    <FollowsContext.Provider value={followsValue}>
      <PinnedContext.Provider value={pinnedValue}>
        <PrefsContext.Provider value={prefsValue}>
          {children}
        </PrefsContext.Provider>
      </PinnedContext.Provider>
    </FollowsContext.Provider>
  );
}

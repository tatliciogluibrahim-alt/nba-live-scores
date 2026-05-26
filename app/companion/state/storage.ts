// Isolated localStorage wrapper. All keys are namespaced under `no-noise:*:v1`
// so v2 migrations and server-prefs swaps can target them surgically.
//
// SSR-safe: every accessor guards `typeof window`. Reads/writes are wrapped
// in try/catch — localStorage can throw in private mode or when quota is full,
// and we never want a storage error to break a render.

import {
  DEFAULT_ALERT_PRESET,
  DEFAULT_PREFS,
  MAX_FREE_ALERT_SLOTS,
  type AlertPreset,
  type Follow,
  type FollowKind,
  type PinnedGame,
  type UserPrefs,
} from "./types";

const NS = "no-noise";
const VERSION = "v1";

export const STORAGE_KEYS = {
  follows: `${NS}:follows:${VERSION}`,
  pinned: `${NS}:pinned:${VERSION}`,
  prefs: `${NS}:prefs:${VERSION}`,
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent — quota, private mode, etc. */
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* silent */
  }
}

const FOLLOW_KINDS = new Set<FollowKind>([
  "team",
  "country",
  "series",
  "tournament",
]);
const ALERT_PRESETS = new Set<AlertPreset>(["quiet", "companion", "all"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHHMM(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isLocalDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeStoredFollows(value: unknown): Follow[] {
  if (!Array.isArray(value)) return [];

  const normalized = value.flatMap((item, index): Follow[] => {
    if (!isObject(item)) return [];
    const kind = item.kind;
    const id = item.id;
    if (typeof kind !== "string" || !FOLLOW_KINDS.has(kind as FollowKind)) {
      return [];
    }
    if (typeof id !== "string" || id.trim().length === 0) return [];

    const tier = ALERT_PRESETS.has(item.alertTier as AlertPreset)
      ? (item.alertTier as AlertPreset)
      : ALERT_PRESETS.has(item.alertPreset as AlertPreset)
      ? (item.alertPreset as AlertPreset)
      : DEFAULT_ALERT_PRESET;

    const followedAt =
      typeof item.followedAt === "number" && Number.isFinite(item.followedAt)
        ? item.followedAt
        : index;

    return [{
      kind: kind as FollowKind,
      id: id.trim(),
      alertEnabled: typeof item.alertEnabled === "boolean" ? item.alertEnabled : true,
      alertTier: tier,
      followedAt,
    }];
  });

  // Migration guard: legacy follows all had implicit alerts. Keep the
  // oldest three enabled, turn the rest into visible-only follows.
  let enabled = 0;
  return normalized
    .sort((a, b) => a.followedAt - b.followedAt)
    .map((follow) => {
      if (!follow.alertEnabled) return follow;
      enabled += 1;
      if (enabled <= MAX_FREE_ALERT_SLOTS) return follow;
      return { ...follow, alertEnabled: false };
    });
}

export function normalizeStoredPinned(value: unknown): PinnedGame[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): PinnedGame[] => {
    if (typeof item === "string" && item.trim()) {
      return [{ gameId: item.trim(), pinnedAt: 0 }];
    }
    if (!isObject(item)) return [];
    const gameId = item.gameId;
    if (typeof gameId !== "string" || gameId.trim().length === 0) return [];
    const pinnedAt =
      typeof item.pinnedAt === "number" && Number.isFinite(item.pinnedAt)
        ? item.pinnedAt
        : 0;
    return [{ gameId: gameId.trim(), pinnedAt }];
  });
}

export function normalizeStoredPrefs(value: unknown): UserPrefs {
  if (!isObject(value)) return DEFAULT_PREFS;

  const next: UserPrefs = {
    ...DEFAULT_PREFS,
    noSpoilers:
      typeof value.noSpoilers === "boolean"
        ? value.noSpoilers
        : DEFAULT_PREFS.noSpoilers,
    defaultAlertTier:
      typeof value.defaultAlertTier === "string" &&
      ALERT_PRESETS.has(value.defaultAlertTier as AlertPreset)
        ? (value.defaultAlertTier as AlertPreset)
        : typeof value.alertPreset === "string" &&
            ALERT_PRESETS.has(value.alertPreset as AlertPreset)
          ? (value.alertPreset as AlertPreset)
          : DEFAULT_PREFS.defaultAlertTier,
    plan: "free",
    remindBeforeMinutes:
      typeof value.remindBeforeMinutes === "number" &&
      Number.isFinite(value.remindBeforeMinutes)
        ? Math.max(0, Math.min(24 * 60, Math.round(value.remindBeforeMinutes)))
        : DEFAULT_PREFS.remindBeforeMinutes,
  };

  const quietHours = value.quietHours;
  if (isObject(quietHours) && isHHMM(quietHours.start) && isHHMM(quietHours.end)) {
    next.quietHours = { start: quietHours.start, end: quietHours.end };
  }
  if (isLocalDate(value.quietRecapSeenDate)) {
    next.quietRecapSeenDate = value.quietRecapSeenDate;
  }
  if (typeof value.notifPromptDismissed === "boolean") {
    next.notifPromptDismissed = value.notifPromptDismissed;
  }
  if (typeof value.firstRunDismissed === "boolean") {
    next.firstRunDismissed = value.firstRunDismissed;
  }
  if (typeof value.installPromptDismissed === "boolean") {
    next.installPromptDismissed = value.installPromptDismissed;
  }

  return next;
}

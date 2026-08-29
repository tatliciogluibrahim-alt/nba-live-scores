// Isolated localStorage wrapper. All keys are namespaced under `no-noise:*:v1`
// so v2 migrations and server-prefs swaps can target them surgically.
//
// SSR-safe: every accessor guards `typeof window`. Reads/writes are wrapped
// in try/catch — localStorage can throw in private mode or when quota is full,
// and we never want a storage error to break a render.

import {
  DEFAULT_PREFS,
  MAX_FREE_ALERT_SLOTS,
  type AlertPreset,
  type Follow,
  type PinnedGame,
  type UserPrefs,
} from "./types";
import { migrateFollowList, toFollow } from "./follow-migration";
import { occupiesAlertSlot } from "../following/data/tournament-phase";

const NS = "no-noise";
const VERSION = "v1";

export const STORAGE_KEYS = {
  // Path B (2026-07-19): follows moved to a v2 blob (moment + scope
  // schema). v1 stays on disk, untouched, for ≥2 releases so a rollback
  // still finds it. All reads and writes go to v2.
  follows: `${NS}:follows:v2`,
  followsLegacy: `${NS}:follows:${VERSION}`,
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

/** Path B normalizer: accepts a v2 blob, a v1 blob, or a mid-migration
 *  mix (one pure migration shared with the server), decorates with the
 *  derived legacy view, and applies the same oldest-three alert-slot cap
 *  the v1 normalizer enforced. */
export function normalizeStoredFollowsV2(value: unknown): Follow[] {
  const migrated = migrateFollowList(value).map(toFollow);
  let enabled = 0;
  return migrated
    .sort((a, b) => a.followedAt - b.followedAt)
    .map((follow) => {
      if (!follow.alertEnabled) return follow;
      // A concluded moment's follow keeps its flag but consumes no slot —
      // the same occupancy rule providers uses (Preseason Review
      // 2026-08-29). Without this, three wrapped playoff follows disabled
      // a legitimately-added fourth on every reload.
      if (!occupiesAlertSlot(follow)) return follow;
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
    lockScreenOffers:
      typeof value.lockScreenOffers === "boolean"
        ? value.lockScreenOffers
        : DEFAULT_PREFS.lockScreenOffers,
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
  if (typeof value.firstFollowEducated === "boolean") {
    next.firstFollowEducated = value.firstFollowEducated;
  }
  // These two were silently dropped on every hydration, so "permanent"
  // dismissals didn't survive a reload — the push-recovery card re-nagged
  // each session and onboarding re-armed for skip-through users.
  if (typeof value.onboardingComplete === "boolean") {
    next.onboardingComplete = value.onboardingComplete;
  }
  if (typeof value.pushRecoveryDismissed === "boolean") {
    next.pushRecoveryDismissed = value.pushRecoveryDismissed;
  }

  return next;
}
